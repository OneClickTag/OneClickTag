/**
 * API Client Setup and Configuration
 * 
 * This file provides utilities to set up and configure the API client
 * for different environments and use cases.
 */

import { QueryClient } from '@tanstack/react-query';
import { apiClient, tokenManager, loadingManager, errorHandler } from './index';
import { ApiConfig, getBaseURL } from './config';

export interface ApiSetupOptions {
  // API Configuration
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  enableLogging?: boolean;
  
  // Authentication
  autoRefresh?: boolean;
  tokenStorageKey?: string;
  
  // React Query
  queryClient?: QueryClient;
  defaultStaleTime?: number;
  defaultCacheTime?: number;
  
  // Error Handling
  globalErrorHandler?: (error: any) => void;
  maxErrorsPerMinute?: number;
  
  // Loading States
  globalLoadingHandler?: (isLoading: boolean) => void;
}

/**
 * Setup API client with configuration
 */
export function setupApiClient(options: ApiSetupOptions = {}) {
  // Configure API client
  if (options.baseURL || options.timeout || options.retryAttempts || options.enableLogging) {
    apiClient.updateConfig({
      baseURL: options.baseURL,
      timeout: options.timeout,
      retryAttempts: options.retryAttempts,
      enableLogging: options.enableLogging,
    } as Partial<ApiConfig>);
  }

  // Setup authentication
  if (options.autoRefresh !== false) {
    setupAuthentication();
  }

  // Setup error handling
  if (options.globalErrorHandler || options.maxErrorsPerMinute) {
    setupErrorHandling(options.globalErrorHandler, options.maxErrorsPerMinute);
  }

  // Setup loading states
  if (options.globalLoadingHandler) {
    setupLoadingStates(options.globalLoadingHandler);
  }

  return apiClient;
}

/**
 * Setup authentication with auto-refresh
 */
function setupAuthentication() {
  // Initialize auth token if available
  const token = tokenManager.getAccessToken();
  if (token) {
    apiClient.setAuthToken(token);
  }

  // Setup token listeners
  tokenManager.addListener((tokens) => {
    if (tokens) {
      apiClient.setAuthToken(tokens.accessToken);
    } else {
      apiClient.clearAuthToken();
    }
  });
}

/**
 * Setup global error handling
 */
function setupErrorHandling(
  globalErrorHandler?: (error: any) => void,
  _maxErrorsPerMinute?: number
) {
  if (globalErrorHandler) {
    errorHandler.addListener(globalErrorHandler);
  }

  // Default error handling for common scenarios
  errorHandler.addListener((error) => {
    // Handle authentication errors
    if (error.code === 'UNAUTHORIZED' || error.status === 401) {
      tokenManager.clearTokens();
      window.location.href = '/login';
    }

    // Handle permission errors
    if (error.code === 'FORBIDDEN' || error.status === 403) {
      console.warn('Permission denied:', error.message);
      // Could show a toast notification here
    }

    // Handle network errors
    if (error.code === 'NETWORK_ERROR') {
      console.warn('Network error:', error.message);
      // Could show offline indicator here
    }
  });
}

/**
 * Setup global loading states
 */
function setupLoadingStates(globalLoadingHandler: (isLoading: boolean) => void) {
  loadingManager.addListener((_loadingStates, isGlobalLoading) => {
    globalLoadingHandler(isGlobalLoading);
  });
}

/**
 * Create React Query client with default configuration
 */
export function createQueryClient(options: {
  defaultStaleTime?: number;
  defaultCacheTime?: number;
  enableDevtools?: boolean;
} = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: options.defaultStaleTime || 5 * 60 * 1000, // 5 minutes
        gcTime: options.defaultCacheTime || 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
          // Don't retry auth errors
          if (error?.status === 401 || error?.status === 403) {
            return false;
          }
          
          // Don't retry validation errors
          if (error?.status === 422) {
            return false;
          }
          
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: false, // Don't retry mutations by default
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  });
}

/**
 * Development setup with enhanced debugging
 */
export function setupDevelopment() {
  setupApiClient({
    enableLogging: true,
    autoRefresh: true,
    globalErrorHandler: (error) => {
      console.group('🚨 API Error');
      console.error('Error:', error);
      console.trace('Stack trace');
      console.groupEnd();
    },
    globalLoadingHandler: (isLoading) => {
      if (isLoading) {
        console.log('🔄 API Loading started');
      } else {
        console.log('✅ API Loading finished');
      }
    },
  });

  // Add development-only utilities to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).__oneClickTagApi = {
      client: apiClient,
      tokenManager,
      loadingManager,
      errorHandler,
      debug: {
        tokens: () => tokenManager.getDebugInfo(),
        loading: () => loadingManager.getDebugInfo(),
        errors: () => errorHandler.getErrorStats(),
      },
    };
  }
}

/**
 * Production setup with optimized configuration
 */
export function setupProduction() {
  setupApiClient({
    enableLogging: false,
    autoRefresh: true,
    timeout: 30000,
    retryAttempts: 3,
    maxErrorsPerMinute: 10,
    globalErrorHandler: (error) => {
      // In production, you might want to send errors to a logging service
      // like Sentry, LogRocket, etc.
      if (error.status >= 500) {
        console.error('Server error:', error.message);
        // sendToLoggingService(error);
      }
    },
  });
}

/**
 * Setup for testing environment
 */
export function setupTesting() {
  setupApiClient({
    enableLogging: false,
    autoRefresh: false,
    timeout: 5000,
    retryAttempts: 0,
  });

  // Mock implementations for testing
  return {
    mockAuth: () => {
      tokenManager.setTokens({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
        expiresAt: Date.now() + 3600000,
      });
    },
    clearAuth: () => {
      tokenManager.clearTokens();
    },
    mockError: (error: any) => {
      errorHandler.handleError(error);
    },
  };
}

/**
 * Environment-specific setup
 */
export function setupForEnvironment() {
  const env = import.meta.env.NODE_ENV || 'development';

  switch (env) {
    case 'development':
      setupDevelopment();
      break;
    case 'production':
      setupProduction();
      break;
    case 'test':
      setupTesting();
      break;
    default:
      setupDevelopment();
  }
}

/**
 * Initialize API client with environment detection
 */
export function initializeApi(customOptions?: ApiSetupOptions) {
  const defaultOptions: ApiSetupOptions = {
    baseURL: getBaseURL(),
    autoRefresh: true,
    enableLogging: import.meta.env.NODE_ENV === 'development',
  };

  const options = { ...defaultOptions, ...customOptions };

  setupApiClient(options);

  return {
    apiClient,
    tokenManager,
    loadingManager,
    errorHandler,
  };
}

// Auto-initialize in browser environments
if (typeof window !== 'undefined' && !window.__oneClickTagApiInitialized) {
  initializeApi();
  window.__oneClickTagApiInitialized = true;
}

// Extend window type for TypeScript
declare global {
  interface Window {
    __oneClickTagApiInitialized?: boolean;
    __oneClickTagApi?: {
      client: typeof apiClient;
      tokenManager: typeof tokenManager;
      loadingManager: typeof loadingManager;
      errorHandler: typeof errorHandler;
      debug: {
        tokens: () => any;
        loading: () => any;
        errors: () => any;
      };
    };
  }
}