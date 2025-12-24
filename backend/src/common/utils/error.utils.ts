/**
 * Error handling utility functions
 */

/**
 * Safely extract error message from unknown error type
 * @param error - The error object (can be any type)
 * @returns A string error message
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return String(error) || 'Unknown error';
}

/**
 * Extract error stack trace safely
 * @param error - The error object
 * @returns Stack trace string or undefined
 */
export function extractErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }

  if (error && typeof error === 'object' && 'stack' in error) {
    return String(error.stack);
  }

  return undefined;
}

/**
 * Create a safe error object for logging
 * @param error - The error object
 * @returns An object with message and stack
 */
export function safeErrorObject(error: unknown): { message: string; stack?: string } {
  return {
    message: extractErrorMessage(error),
    stack: extractErrorStack(error),
  };
}
