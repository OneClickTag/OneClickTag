import { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiConfig } from './config';
import { tokenManager } from './auth/tokenManager';
import { loadingManager } from './loading/loadingManager';

/**
 * Request interceptor factory
 */
export function createRequestInterceptor(config: ApiConfig) {
  return async (requestConfig: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    // Add timestamp for logging
    const startTime = Date.now();
    (requestConfig as any).__startTime = startTime;

    // Generate request ID for tracking
    const requestId = `${startTime}-${Math.random().toString(36).substr(2, 9)}`;
    (requestConfig as any).__requestId = requestId;

    // Add authorization header if not explicitly skipped
    const skipAuth = (requestConfig as any).skipAuth;
    if (!skipAuth) {
      // Check if token will expire soon and refresh if needed
      if (tokenManager.willExpireSoon(10) && tokenManager.hasRefreshToken()) {
        try {
          // Mark this request as pending token refresh
          (requestConfig as any).__tokenRefreshPending = true;
        } catch (error) {
          console.warn('Token refresh check failed:', error);
        }
      }

      const accessToken = tokenManager.getAccessToken();
      if (accessToken) {
        requestConfig.headers = requestConfig.headers || {};
        requestConfig.headers.Authorization = `Bearer ${accessToken}`;
      } else if (tokenManager.hasRefreshToken() && !(requestConfig as any).skipRefresh) {
        // No valid access token but we have a refresh token
        // This will be handled by the response interceptor
        (requestConfig as any).__needsTokenRefresh = true;
      }
    }

    // Add default headers
    if (!requestConfig.headers) {
      requestConfig.headers = {};
    }
    Object.assign(requestConfig.headers, {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Client-Version': '1.0.0',
      'X-Request-ID': requestId,
    });

    // Add user agent information
    if (typeof window !== 'undefined') {
      requestConfig.headers['X-User-Agent'] = navigator.userAgent;
    }

    // Log request in development
    if (config.enableLogging) {
      console.group(`🚀 API Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
      console.log('Request ID:', requestId);
      console.log('Config:', {
        url: requestConfig.url,
        method: requestConfig.method,
        headers: requestConfig.headers,
        data: requestConfig.data,
        params: requestConfig.params,
      });
      console.groupEnd();
    }

    // Track loading state
    loadingManager.setLoading(true, requestId);

    return requestConfig;
  };
}

/**
 * Response interceptor factory
 */
export function createResponseInterceptor(config: ApiConfig) {
  return (response: AxiosResponse): AxiosResponse => {
    const requestConfig = response.config as any;
    const requestId = requestConfig.__requestId;
    const startTime = requestConfig.__startTime;
    const duration = Date.now() - startTime;

    // Update loading state
    loadingManager.setLoading(false, requestId);

    // Log response in development
    if (config.enableLogging) {
      console.group(`✅ API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log('Request ID:', requestId);
      console.log('Duration:', `${duration}ms`);
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', response.headers);
      console.log('Data:', response.data);
      console.groupEnd();
    }

    // Add metadata to response
    (response as any).__requestId = requestId;
    (response as any).__duration = duration;
    (response as any).__timestamp = Date.now();

    // Handle response transformations
    response.data = transformResponseData(response.data);

    return response;
  };
}

/**
 * Transform response data to standardize format
 */
function transformResponseData(data: any): any {
  // If the response is already in the expected format, return as-is
  if (data && typeof data === 'object') {
    // Handle pagination responses
    if (data.data && data.pagination) {
      return {
        data: data.data,
        pagination: data.pagination,
        meta: data.meta || {},
      };
    }

    // Handle single resource responses
    if (data.data && !Array.isArray(data.data) && !data.pagination) {
      return {
        data: data.data,
        meta: data.meta || {},
      };
    }

    // Handle error responses
    if (data.error) {
      return data;
    }

    // Handle array responses (wrap in data property for consistency)
    if (Array.isArray(data)) {
      return {
        data: data,
        meta: {},
      };
    }
  }

  // Return data as-is if no transformation needed
  return data;
}

/**
 * Request retry interceptor
 */
export function createRetryInterceptor() {
  return {
    shouldRetry: (error: any): boolean => {
      // Don't retry if explicitly disabled
      if (error.config?.retry === false) {
        return false;
      }

      // Don't retry 4xx errors (client errors)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        return false;
      }

      // Don't retry POST, PUT, PATCH requests by default (not idempotent)
      const method = error.config?.method?.toLowerCase();
      if (['post', 'put', 'patch'].includes(method) && !error.config?.retryNonIdempotent) {
        return false;
      }

      // Retry network errors and 5xx server errors
      return !error.response || error.response.status >= 500;
    },

    calculateDelay: (retryCount: number, error: any): number => {
      // Use exponential backoff with jitter
      const baseDelay = error.config?.retryDelay || 1000;
      const maxDelay = error.config?.retryMaxDelay || 30000;
      
      const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
      const jitter = Math.random() * 0.1 * exponentialDelay;
      
      return Math.min(exponentialDelay + jitter, maxDelay);
    },
  };
}

/**
 * Request timeout interceptor
 */
export function createTimeoutInterceptor(defaultTimeout: number = 30000) {
  return (requestConfig: AxiosRequestConfig): AxiosRequestConfig => {
    // Set timeout if not already specified
    if (!requestConfig.timeout) {
      requestConfig.timeout = defaultTimeout;
    }

    // Add abort controller for manual cancellation
    if (typeof window !== 'undefined' && window.AbortController) {
      const controller = new AbortController();
      requestConfig.signal = requestConfig.signal || controller.signal;
      
      // Store controller for potential manual cancellation
      (requestConfig as any).__abortController = controller;
    }

    return requestConfig;
  };
}

/**
 * Response caching interceptor (for GET requests)
 */
export function createCacheInterceptor(cacheTTL: number = 5 * 60 * 1000) { // 5 minutes default
  const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  return {
    request: (requestConfig: AxiosRequestConfig): AxiosRequestConfig => {
      // Only cache GET requests
      if (requestConfig.method?.toLowerCase() !== 'get') {
        return requestConfig;
      }

      // Skip cache if explicitly disabled
      if ((requestConfig as any).skipCache) {
        return requestConfig;
      }

      // Generate cache key
      const cacheKey = generateCacheKey(requestConfig);
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        // Return cached response
        (requestConfig as any).__cachedResponse = cached.data;
      }

      return requestConfig;
    },

    response: (response: AxiosResponse): AxiosResponse => {
      // Only cache successful GET responses
      if (
        response.config.method?.toLowerCase() === 'get' &&
        response.status >= 200 &&
        response.status < 300 &&
        !(response.config as any).skipCache
      ) {
        const cacheKey = generateCacheKey(response.config);
        const ttl = (response.config as any).cacheTTL || cacheTTL;
        
        cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
          ttl,
        });

        // Clean up expired cache entries periodically
        if (Math.random() < 0.01) { // 1% chance to clean up
          cleanupCache();
        }
      }

      return response;
    },
  };

  function generateCacheKey(config: AxiosRequestConfig): string {
    const url = config.url || '';
    const params = JSON.stringify(config.params || {});
    const headers = JSON.stringify(config.headers || {});
    return `${url}:${params}:${headers}`;
  }

  function cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        cache.delete(key);
      }
    }
  }
}

/**
 * Request deduplication interceptor
 */
export function createDeduplicationInterceptor() {
  const pendingRequests = new Map<string, Promise<AxiosResponse>>();

  return {
    request: async (requestConfig: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
      // Only deduplicate GET requests
      if (requestConfig.method?.toLowerCase() !== 'get') {
        return requestConfig;
      }

      // Skip deduplication if explicitly disabled
      if ((requestConfig as any).skipDeduplication) {
        return requestConfig;
      }

      const requestKey = generateRequestKey(requestConfig);
      const pendingRequest = pendingRequests.get(requestKey);

      if (pendingRequest) {
        // Wait for the existing request to complete
        try {
          const response = await pendingRequest;
          (requestConfig as any).__deduplicatedResponse = response.data;
        } catch (error) {
          // If the pending request failed, allow this request to proceed
        }
      }

      return requestConfig;
    },

    response: (response: AxiosResponse): AxiosResponse => {
      if (response.config.method?.toLowerCase() === 'get') {
        const requestKey = generateRequestKey(response.config);
        pendingRequests.delete(requestKey);
      }

      return response;
    },

    error: (error: any): void => {
      if (error.config?.method?.toLowerCase() === 'get') {
        const requestKey = generateRequestKey(error.config);
        pendingRequests.delete(requestKey);
      }
    },
  };

  function generateRequestKey(config: AxiosRequestConfig): string {
    const url = config.url || '';
    const params = JSON.stringify(config.params || {});
    return `${url}:${params}`;
  }
}