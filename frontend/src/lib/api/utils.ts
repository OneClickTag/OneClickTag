import { ApiError, PaginationInfo, ListQueryParams } from './types';

/**
 * Create query keys for React Query
 */
export const createQueryKeys = {
  customers: {
    all: ['customers'] as const,
    lists: () => [...createQueryKeys.customers.all, 'list'] as const,
    list: (params?: any) => [...createQueryKeys.customers.lists(), params] as const,
    details: () => [...createQueryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...createQueryKeys.customers.details(), id] as const,
    search: (query: string) => [...createQueryKeys.customers.all, 'search', query] as const,
  },
  campaigns: {
    all: ['campaigns'] as const,
    lists: () => [...createQueryKeys.campaigns.all, 'list'] as const,
    list: (params?: any) => [...createQueryKeys.campaigns.lists(), params] as const,
    details: () => [...createQueryKeys.campaigns.all, 'detail'] as const,
    detail: (id: string) => [...createQueryKeys.campaigns.details(), id] as const,
    analytics: (id: string, params?: any) => [...createQueryKeys.campaigns.detail(id), 'analytics', params] as const,
    events: (id: string, params?: any) => [...createQueryKeys.campaigns.detail(id), 'events', params] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    overview: (params?: any) => [...createQueryKeys.analytics.all, 'overview', params] as const,
    customerUsage: (params?: any) => [...createQueryKeys.analytics.all, 'customer-usage', params] as const,
    campaignPerformance: (params?: any) => [...createQueryKeys.analytics.all, 'campaign-performance', params] as const,
    systemHealth: () => [...createQueryKeys.analytics.all, 'system-health'] as const,
  },
  search: {
    all: ['search'] as const,
    global: (query: string, filters?: any) => [...createQueryKeys.search.all, 'global', query, filters] as const,
    suggestions: (query: string) => [...createQueryKeys.search.all, 'suggestions', query] as const,
    history: () => [...createQueryKeys.search.all, 'history'] as const,
  },
} as const;

/**
 * Transform API errors to user-friendly messages
 */
export function getErrorMessage(error: ApiError | Error | unknown): string {
  if (!error) return 'An unknown error occurred';

  // If it's already an ApiError
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const apiError = error as ApiError;
    
    switch (apiError.code) {
      case 'VALIDATION_ERROR':
        if (apiError.details?.fields && Array.isArray(apiError.details.fields)) {
          const fieldErrors = apiError.details.fields
            .map((field: any) => `${field.field}: ${field.message}`)
            .join(', ');
          return `Validation failed: ${fieldErrors}`;
        }
        return apiError.message || 'Please check your input and try again';
      
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
      
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment and try again.';
      
      case 'SERVER_ERROR':
      case 'INTERNAL_SERVER_ERROR':
        return 'Something went wrong on our end. Please try again later.';
      
      default:
        return apiError.message || 'An unexpected error occurred. Please try again.';
    }
  }

  // If it's a regular Error
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred';
  }

  // If it's a string
  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Build query parameters for API requests
 */
export function buildQueryParams(params: Record<string, any>): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams;
}

/**
 * Create pagination helpers
 */
export function createPaginationHelpers(pagination: PaginationInfo) {
  return {
    totalPages: pagination.totalPages,
    currentPage: pagination.page,
    hasNextPage: pagination.hasNextPage,
    hasPrevPage: pagination.hasPrevPage,
    nextPage: pagination.hasNextPage ? pagination.page + 1 : null,
    prevPage: pagination.hasPrevPage ? pagination.page - 1 : null,
    startItem: ((pagination.page - 1) * pagination.limit) + 1,
    endItem: Math.min(pagination.page * pagination.limit, pagination.total),
    pageRange: generatePageRange(pagination.page, pagination.totalPages),
  };
}

/**
 * Generate page range for pagination
 */
function generatePageRange(currentPage: number, totalPages: number, maxVisible: number = 5): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = currentPage - half;
  let end = currentPage + half;

  if (start < 1) {
    start = 1;
    end = maxVisible;
  } else if (end > totalPages) {
    start = totalPages - maxVisible + 1;
    end = totalPages;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for API calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;

      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}

/**
 * Transform list parameters for API requests
 */
export function transformListParams(params: ListQueryParams) {
  return {
    page: params.page || 1,
    limit: Math.min(params.limit || 20, 100), // Cap at 100
    search: params.search?.trim() || undefined,
    sortBy: params.sortBy || undefined,
    sortOrder: params.sortOrder || 'asc',
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize filename for download
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  
  const source = sources.shift()!;

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key] || {});
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Create abort controller with timeout
 */
export function createAbortController(timeout?: number): AbortController {
  const controller = new AbortController();
  
  if (timeout) {
    setTimeout(() => {
      controller.abort();
    }, timeout);
  }
  
  return controller;
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date for API
 */
export function formatDateForAPI(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Parse API date
 */
export function parseAPIDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Check if response is paginated
 */
export function isPaginatedResponse(data: any): data is { data: any[]; pagination: PaginationInfo } {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.data) &&
    data.pagination &&
    typeof data.pagination === 'object'
  );
}

/**
 * Extract error details for logging
 */
export function extractErrorDetails(error: any): Record<string, any> {
  const details: Record<string, any> = {};

  if (error) {
    details.message = error.message;
    details.code = error.code;
    details.status = error.status;
    details.statusText = error.statusText;
    
    if (error.details) {
      details.apiDetails = error.details;
    }
    
    if (error.stack) {
      details.stack = error.stack;
    }
  }

  return details;
}