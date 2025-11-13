import { AxiosError } from 'axios';
import { ApiError, ErrorResponse, ValidationErrorResponse } from '../types';

export type ErrorListener = (error: ApiError) => void;

export class ErrorHandler {
  private listeners: ErrorListener[] = [];
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, number> = new Map();
  private maxErrorsPerMinute = 10;

  /**
   * Handle API errors and transform them to a consistent format
   */
  handleError(error: any): ApiError {
    let apiError: ApiError;

    if (this.isAxiosError(error)) {
      apiError = this.handleAxiosError(error);
    } else if (error instanceof Error) {
      apiError = this.handleGenericError(error);
    } else if (typeof error === 'string') {
      apiError = {
        code: 'UNKNOWN_ERROR',
        message: error,
      };
    } else {
      apiError = {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        details: error,
      };
    }

    // Track error frequency
    this.trackError(apiError);

    // Notify listeners
    this.notifyListeners(apiError);

    return apiError;
  }

  /**
   * Handle Axios-specific errors
   */
  private handleAxiosError(error: AxiosError): ApiError {
    const response = error.response;
    const request = error.request;

    // Network errors
    if (!response && request) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error - please check your internet connection',
        details: {
          originalMessage: error.message,
          url: error.config?.url,
          method: error.config?.method,
        },
      };
    }

    // Request timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'Request timed out - please try again',
        details: {
          timeout: error.config?.timeout,
          url: error.config?.url,
        },
      };
    }

    // Request was cancelled
    if (error.message.includes('canceled') || error.message.includes('cancelled')) {
      return {
        code: 'REQUEST_CANCELLED',
        message: 'Request was cancelled',
        details: {
          url: error.config?.url,
        },
      };
    }

    // Server response errors
    if (response) {
      return this.handleResponseError(response.status, response.data, error);
    }

    // Fallback for other errors
    return {
      code: 'REQUEST_ERROR',
      message: error.message || 'Request failed',
      details: {
        originalError: error,
        url: error.config?.url,
        method: error.config?.method,
      },
    };
  }

  /**
   * Handle HTTP response errors
   */
  private handleResponseError(status: number, data: any, originalError: AxiosError): ApiError {
    const baseError = {
      status,
      statusText: originalError.response?.statusText,
    };

    // Try to extract error from response data
    if (data && typeof data === 'object') {
      // Standard API error response
      if (data.error) {
        const errorData = data.error as ErrorResponse['error'];
        return {
          ...baseError,
          code: errorData.code || this.getDefaultErrorCode(status),
          message: errorData.message || this.getDefaultErrorMessage(status),
          details: errorData.details,
        };
      }

      // Validation error response
      if (data.errors || (Array.isArray(data.error?.details) && data.error?.code === 'VALIDATION_ERROR')) {
        const validationData = data as ValidationErrorResponse;
        return {
          ...baseError,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            fields: validationData.error.details,
            originalMessage: validationData.error.message,
          },
        };
      }

      // Generic error with message
      if (data.message) {
        return {
          ...baseError,
          code: this.getDefaultErrorCode(status),
          message: data.message,
          details: data,
        };
      }
    }

    // Default error based on status code
    return {
      ...baseError,
      code: this.getDefaultErrorCode(status),
      message: this.getDefaultErrorMessage(status),
      details: {
        responseData: data,
      },
    };
  }

  /**
   * Handle generic JavaScript errors
   */
  private handleGenericError(error: Error): ApiError {
    return {
      code: 'CLIENT_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: {
        name: error.name,
        stack: error.stack,
      },
    };
  }

  /**
   * Get default error code based on HTTP status
   */
  private getDefaultErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      case 504:
        return 'GATEWAY_TIMEOUT';
      default:
        return status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR';
    }
  }

  /**
   * Get default error message based on HTTP status
   */
  private getDefaultErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Bad request - please check your input';
      case 401:
        return 'You are not authorized to perform this action';
      case 403:
        return 'You do not have permission to access this resource';
      case 404:
        return 'The requested resource was not found';
      case 409:
        return 'Conflict - the resource already exists or is in use';
      case 422:
        return 'Validation failed - please check your input';
      case 429:
        return 'Rate limit exceeded - please try again later';
      case 500:
        return 'Internal server error - please try again later';
      case 502:
        return 'Bad gateway - the server is temporarily unavailable';
      case 503:
        return 'Service unavailable - please try again later';
      case 504:
        return 'Gateway timeout - the request took too long to process';
      default:
        return status >= 500
          ? 'Server error - please try again later'
          : 'An error occurred - please try again';
    }
  }

  /**
   * Check if error is an Axios error
   */
  private isAxiosError(error: any): error is AxiosError {
    return error && error.isAxiosError === true;
  }

  /**
   * Track error frequency to detect patterns
   */
  private trackError(error: ApiError): void {
    const errorKey = `${error.code}:${error.status || 'unknown'}`;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean up old error timestamps
    for (const [key, timestamp] of this.lastErrors.entries()) {
      if (timestamp < oneMinuteAgo) {
        this.lastErrors.delete(key);
        this.errorCounts.delete(key);
      }
    }

    // Update error count
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    this.lastErrors.set(errorKey, now);

    // Log warning if error frequency is high
    if (currentCount >= this.maxErrorsPerMinute) {
      console.warn(`High error frequency detected for ${errorKey}: ${currentCount} errors in the last minute`);
    }
  }

  /**
   * Add error listener
   */
  addListener(listener: ErrorListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Remove error listener
   */
  removeListener(listener: ErrorListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners of an error
   */
  private notifyListeners(error: ApiError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.warn('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: Array<{ code: string; count: number; lastOccurred: number }>;
  } {
    const errorsByCode: Record<string, number> = {};
    const recentErrors: Array<{ code: string; count: number; lastOccurred: number }> = [];
    let totalErrors = 0;

    for (const [key, count] of this.errorCounts.entries()) {
      const [code] = key.split(':');
      errorsByCode[code] = (errorsByCode[code] || 0) + count;
      totalErrors += count;

      recentErrors.push({
        code: key,
        count,
        lastOccurred: this.lastErrors.get(key) || 0,
      });
    }

    return {
      totalErrors,
      errorsByCode,
      recentErrors: recentErrors.sort((a, b) => b.lastOccurred - a.lastOccurred),
    };
  }

  /**
   * Clear error statistics
   */
  clearStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * Check if an error should be retried
   */
  shouldRetry(error: ApiError): boolean {
    // Don't retry client errors (4xx)
    if (error.status && error.status >= 400 && error.status < 500) {
      return false;
    }

    // Don't retry validation errors
    if (error.code === 'VALIDATION_ERROR') {
      return false;
    }

    // Don't retry authorization errors
    if (['UNAUTHORIZED', 'FORBIDDEN'].includes(error.code)) {
      return false;
    }

    // Retry network, timeout, and server errors
    return [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVER_ERROR',
      'INTERNAL_SERVER_ERROR',
      'BAD_GATEWAY',
      'SERVICE_UNAVAILABLE',
      'GATEWAY_TIMEOUT',
    ].includes(error.code);
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: ApiError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'TIMEOUT_ERROR':
        return 'The request is taking longer than expected. Please try again.';
      case 'UNAUTHORIZED':
        return 'Your session has expired. Please log in again.';
      case 'FORBIDDEN':
        return "You don't have permission to perform this action.";
      case 'NOT_FOUND':
        return 'The requested item could not be found.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment and try again.';
      case 'SERVER_ERROR':
      case 'INTERNAL_SERVER_ERROR':
        return 'Something went wrong on our end. Please try again later.';
      case 'SERVICE_UNAVAILABLE':
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
}

// Create and export singleton instance
export const errorHandler = new ErrorHandler();

// Export the class for creating custom instances
export default ErrorHandler;