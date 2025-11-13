import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { defaultApiConfig, ApiConfig } from './config';
import { ApiRequestConfig, ApiResponse, ApiError, AuthTokens } from './types';
import { tokenManager } from './auth/tokenManager';
import { createRequestInterceptor, createResponseInterceptor } from './interceptors';
import { loadingManager } from './loading/loadingManager';
import { errorHandler } from './errors/errorHandler';

export class ApiClient {
  private axios: AxiosInstance;
  private config: ApiConfig;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...defaultApiConfig, ...config };
    
    // Create axios instance with default config
    this.axios = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup retry logic
    this.setupRetry();
    
    // Setup interceptors
    this.setupInterceptors();
  }

  private setupRetry(): void {
    axiosRetry(this.axios, {
      retries: this.config.retryAttempts,
      retryDelay: (retryCount) => {
        return this.config.retryDelay * Math.pow(2, retryCount - 1);
      },
      retryCondition: (error) => {
        // Retry on network errors and 5xx status codes, but not on 4xx
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status ? error.response.status >= 500 : false);
      },
      shouldResetTimeout: true,
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      createRequestInterceptor(this.config),
      (error) => {
        loadingManager.setLoading(false);
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      createResponseInterceptor(this.config),
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        
        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.axios.request(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens
            tokenManager.clearTokens();
            
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
            
            return Promise.reject(this.handleError(refreshError));
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private async refreshToken(): Promise<string | null> {
    if (this.isRefreshing) {
      // Wait for the ongoing refresh to complete
      return new Promise((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;
    
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.axios.post('/auth/refresh', {
        refreshToken,
      }, {
        skipAuth: true,
        skipRefresh: true,
      } as any);

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
      
      const tokens: AuthTokens = {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        expiresAt: Date.now() + (expiresIn * 1000),
      };

      tokenManager.setTokens(tokens);

      // Notify all waiting requests
      this.refreshSubscribers.forEach(callback => callback(accessToken));
      this.refreshSubscribers = [];

      return accessToken;
    } catch (error) {
      this.refreshSubscribers.forEach(callback => callback(''));
      this.refreshSubscribers = [];
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  private handleError(error: any): ApiError {
    return errorHandler.handleError(error);
  }

  private createRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async get<T = any>(
    url: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.createRequestId();
    loadingManager.setLoading(true, requestId);

    try {
      const response = await this.axios.get<T>(url, {
        ...config,
        signal: config.signal,
      });

      loadingManager.setLoading(false, requestId);
      return this.transformResponse(response);
    } catch (error) {
      loadingManager.setLoading(false, requestId);
      throw error;
    }
  }

  async post<T = any, D = any>(
    url: string,
    data?: D,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.createRequestId();
    loadingManager.setLoading(true, requestId);

    try {
      const response = await this.axios.post<T>(url, data, {
        ...config,
        signal: config.signal,
        onUploadProgress: config.onUploadProgress ? (progressEvent) => {
          config.onUploadProgress!(progressEvent);
        } : undefined,
      });

      loadingManager.setLoading(false, requestId);
      return this.transformResponse(response);
    } catch (error) {
      loadingManager.setLoading(false, requestId);
      throw error;
    }
  }

  async put<T = any, D = any>(
    url: string,
    data?: D,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.createRequestId();
    loadingManager.setLoading(true, requestId);

    try {
      const response = await this.axios.put<T>(url, data, {
        ...config,
        signal: config.signal,
      });

      loadingManager.setLoading(false, requestId);
      return this.transformResponse(response);
    } catch (error) {
      loadingManager.setLoading(false, requestId);
      throw error;
    }
  }

  async patch<T = any, D = any>(
    url: string,
    data?: D,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.createRequestId();
    loadingManager.setLoading(true, requestId);

    try {
      const response = await this.axios.patch<T>(url, data, {
        ...config,
        signal: config.signal,
      });

      loadingManager.setLoading(false, requestId);
      return this.transformResponse(response);
    } catch (error) {
      loadingManager.setLoading(false, requestId);
      throw error;
    }
  }

  async delete<T = any>(
    url: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.createRequestId();
    loadingManager.setLoading(true, requestId);

    try {
      const response = await this.axios.delete<T>(url, {
        ...config,
        signal: config.signal,
      });

      loadingManager.setLoading(false, requestId);
      return this.transformResponse(response);
    } catch (error) {
      loadingManager.setLoading(false, requestId);
      throw error;
    }
  }

  async upload<T = any>(
    url: string,
    file: File,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const requestId = this.createRequestId();
    loadingManager.setLoading(true, requestId);

    try {
      const response = await this.axios.post<T>(url, formData, {
        ...config,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: config.onUploadProgress ? (progressEvent) => {
          config.onUploadProgress!(progressEvent);
        } : undefined,
      });

      loadingManager.setLoading(false, requestId);
      return this.transformResponse(response);
    } catch (error) {
      loadingManager.setLoading(false, requestId);
      throw error;
    }
  }

  async download(
    url: string,
    filename?: string,
    config: ApiRequestConfig = {}
  ): Promise<void> {
    const requestId = this.createRequestId();
    loadingManager.setLoading(true, requestId);

    try {
      const response = await this.axios.get(url, {
        ...config,
        responseType: 'blob',
        onDownloadProgress: config.onDownloadProgress ? (progressEvent) => {
          config.onDownloadProgress!(progressEvent);
        } : undefined,
      });

      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      loadingManager.setLoading(false, requestId);
    } catch (error) {
      loadingManager.setLoading(false, requestId);
      throw error;
    }
  }

  private transformResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
    };
  }

  // Utility methods
  setAuthToken(token: string): void {
    this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    delete this.axios.defaults.headers.common['Authorization'];
  }

  updateConfig(config: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...config };
    this.axios.defaults.baseURL = this.config.baseURL;
    this.axios.defaults.timeout = this.config.timeout;
  }

  getConfig(): ApiConfig {
    return { ...this.config };
  }

  // Create a new instance with different config
  static create(config?: Partial<ApiConfig>): ApiClient {
    return new ApiClient(config);
  }
}

// Create and export default instance
export const apiClient = new ApiClient();

// Export the class for creating custom instances
export default ApiClient;