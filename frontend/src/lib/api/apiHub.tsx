/**
 * Main API Hub - Central entry point for all API services
 * Provides type-safe, auto-generated API client with comprehensive features
 */

import React from 'react';

import { TypedApiClient } from './typed-client';
import { ApiClient, apiClient } from './client';
import { tokenManager } from './auth/tokenManager';
import { loadingManager } from './loading/loadingManager';
import { errorHandler } from './errors/errorHandler';

// Services
import { authService, customersApi, campaignsApi } from './services';

// Types
export type * from './types';
export type * from './generated/schema';

// Configuration
import { defaultApiConfig } from './config';
import type { ApiConfig } from './config';

export class ApiHub {
  // Core clients
  public readonly typedClient: TypedApiClient;
  public readonly client: ApiClient;

  // Managers
  public readonly auth = tokenManager;
  public readonly loading = loadingManager;
  public readonly errors = errorHandler;

  // Services (typed)
  // public readonly customers = typedCustomerService;

  // Services (legacy - for backward compatibility)
  public readonly legacy = {
    customers: customersApi,
    auth: authService,
    campaigns: campaignsApi,
  };

  constructor(config?: Partial<ApiConfig>) {
    this.client = config ? new ApiClient(config) : apiClient;
    this.typedClient = new TypedApiClient(this.client);
  }

  /**
   * Initialize the API hub with configuration
   */
  async initialize(config?: {
    baseURL?: string;
    timeout?: number;
    enableLogging?: boolean;
    autoRefresh?: boolean;
    retryAttempts?: number;
  }): Promise<void> {
    // Update client configuration
    if (config) {
      this.client.updateConfig({
        ...defaultApiConfig,
        ...config,
      });
    }

    // Setup auto-refresh if enabled
    if (config?.autoRefresh !== false) {
      this.setupAutoRefresh();
    }

    // Initialize auth token if available
    const token = this.auth.getAccessToken();
    if (token) {
      this.client.setAuthToken(token);
    }

    // Setup error handling
    this.setupErrorHandling();

    // Setup loading state management
    this.setupLoadingManagement();
  }

  /**
   * Setup automatic token refresh
   */
  private setupAutoRefresh(): void {
    this.auth.setupAutoRefresh(async () => {
      const refreshToken = this.auth.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.client.post('/auth/refresh', {
        refreshToken,
      }, {
        skipAuth: true,
        skipRefresh: true,
      } as any);

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
      
      this.auth.setTokens({
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        expiresAt: Date.now() + (expiresIn * 1000),
      });

      // Update client with new token
      this.client.setAuthToken(accessToken);
    });
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling(): void {
    this.errors.addListener((error) => {
      // Log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', error);
      }

      // Handle specific error cases
      if (error.code === 'UNAUTHORIZED') {
        // Clear tokens and redirect to login
        this.auth.clearTokens();
        this.client.clearAuthToken();
        
        // Only redirect if not already on auth pages
        const currentPath = window.location.pathname;
        const isOnAuthPage = currentPath.includes('/login') || 
                           currentPath.includes('/register') ||
                           currentPath.includes('/auth');
        
        if (!isOnAuthPage) {
          // Add small delay to allow auth state to settle
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }

      // Handle rate limiting
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        console.warn('Rate limit exceeded. Consider implementing request queuing.');
      }

      // Handle network errors
      if (error.code === 'NETWORK_ERROR') {
        console.warn('Network error detected. User might be offline.');
      }
    });
  }

  /**
   * Setup loading state management
   */
  private setupLoadingManagement(): void {
    this.loading.addListener((loadingStates, isGlobalLoading) => {
      // Update global loading indicator if available
      const globalLoadingEl = document.querySelector('[data-global-loading]');
      if (globalLoadingEl) {
        globalLoadingEl.classList.toggle('loading', isGlobalLoading);
      }

      // Log loading states in development
      if (process.env.NODE_ENV === 'development' && isGlobalLoading) {
        console.log('Loading states:', loadingStates);
      }
    });
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: {
      api: boolean;
      auth: boolean;
      database?: boolean;
    };
    timestamp: string;
  }> {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'healthy',
        services: response.data.services || { api: true, auth: true },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        services: { api: false, auth: false },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get API statistics and debug information
   */
  getDebugInfo(): {
    auth: ReturnType<typeof tokenManager.getDebugInfo>;
    loading: ReturnType<typeof loadingManager.getDebugInfo>;
    errors: ReturnType<typeof errorHandler.getErrorStats>;
    config: ApiConfig;
  } {
    return {
      auth: this.auth.getDebugInfo(),
      loading: this.loading.getDebugInfo(),
      errors: this.errors.getErrorStats(),
      config: this.client.getConfig(),
    };
  }

  /**
   * Clear all caches and reset state
   */
  reset(): void {
    this.auth.clearTokens();
    this.client.clearAuthToken();
    this.loading.clearAllLoading();
    this.errors.clearStats();
  }

  /**
   * Create a scoped API hub for specific features
   */
  createScope(scopeName: string): ScopedApiHub {
    return new ScopedApiHub(this, scopeName);
  }
}

/**
 * Scoped API Hub for feature-specific API management
 */
export class ScopedApiHub {
  public readonly loading: ReturnType<typeof loadingManager.createScope>;

  constructor(
    private parent: ApiHub,
    scope: string
  ) {
    this.loading = parent.loading.createScope(scope);
  }

  // Proxy access to parent services with scoped loading
  // get customers() {
  //   return this.parent.customers;
  // }

  get typedClient() {
    return this.parent.typedClient;
  }

  get client() {
    return this.parent.client;
  }

  get auth() {
    return this.parent.auth;
  }

  get errors() {
    return this.parent.errors;
  }

  /**
   * Clear all loading states for this scope
   */
  clearLoading(): void {
    this.loading.clearAllScopedLoading();
  }
}

// Create and export default API hub instance
export const apiHub = new ApiHub();

// Auto-initialize with default config
apiHub.initialize();

// Export convenience functions
export const {
  typedClient,
  client,
  auth: authManager,
  loading: exportedLoadingManager,
  errors: errorManager,
  legacy,
} = apiHub;

// Export for React Context
export const ApiContext = React.createContext<ApiHub>(apiHub);

// React hook to access API hub
export function useApiHub(): ApiHub {
  const context = React.useContext(ApiContext);
  if (!context) {
    throw new Error('useApiHub must be used within ApiProvider');
  }
  return context;
}

// React provider component
export function ApiProvider({ 
  children, 
  config,
  hub = apiHub 
}: { 
  children: React.ReactNode;
  config?: Partial<ApiConfig>;
  hub?: ApiHub;
}) {
  React.useEffect(() => {
    if (config) {
      hub.initialize(config);
    }
  }, [config, hub]);

  return (
    <ApiContext.Provider value={hub}>
      {children}
    </ApiContext.Provider>
  );
}

// Default export
export default apiHub;