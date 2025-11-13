import { apiClient } from '../client';
import { apiEndpoints } from '../config';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  FirebaseAuthRequest,
  User,
  ApiRequestConfig,
  ApiResponse,
} from '../types';
import { tokenManager } from '../auth/tokenManager';

export class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest, config?: ApiRequestConfig): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse, LoginRequest>(
      apiEndpoints.auth.login,
      credentials,
      {
        ...config,
        skipAuth: true, // Don't send auth header for login
      }
    );

    // Store tokens after successful login
    if (response.data.accessToken) {
      tokenManager.setTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
        expiresAt: Date.now() + (response.data.expiresIn * 1000),
      });

      // Set auth token in client
      apiClient.setAuthToken(response.data.accessToken);
    }

    return response;
  }

  /**
   * Authenticate with Firebase ID token
   */
  async authenticateWithFirebase(firebaseAuthData: FirebaseAuthRequest, config?: ApiRequestConfig): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse, FirebaseAuthRequest>(
      apiEndpoints.auth.firebase,
      firebaseAuthData,
      {
        ...config,
        skipAuth: true, // Don't send auth header for Firebase auth
      }
    );

    // Store tokens after successful authentication
    if (response.data.accessToken) {
      tokenManager.setTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
        expiresAt: Date.now() + (response.data.expiresIn * 1000),
      });

      // Set auth token in client
      apiClient.setAuthToken(response.data.accessToken);
    }

    return response;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenData?: RefreshTokenRequest, config?: ApiRequestConfig): Promise<ApiResponse<LoginResponse>> {
    const refreshToken = refreshTokenData?.refreshToken || tokenManager.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<LoginResponse, RefreshTokenRequest>(
      apiEndpoints.auth.refresh,
      { refreshToken },
      {
        ...config,
        skipAuth: true,
        skipRefresh: true, // Prevent infinite refresh loops
      }
    );

    // Update stored tokens
    if (response.data.accessToken) {
      tokenManager.setTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
        expiresAt: Date.now() + (response.data.expiresIn * 1000),
      });

      // Update auth token in client
      apiClient.setAuthToken(response.data.accessToken);
    }

    return response;
  }

  /**
   * Logout and clear tokens
   */
  async logout(config?: ApiRequestConfig): Promise<void> {
    try {
      // Call logout endpoint if available
      await apiClient.post(apiEndpoints.auth.logout, {}, config);
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear tokens and redirect
      tokenManager.clearTokens();
      apiClient.clearAuthToken();
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(config?: ApiRequestConfig): Promise<ApiResponse<User>> {
    return apiClient.get<User>(apiEndpoints.auth.me, config);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return tokenManager.isAuthenticated();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return tokenManager.getAccessToken();
  }

  /**
   * Get current user from stored tokens (decoded from JWT)
   */
  getCurrentUserFromToken(): Partial<User> | null {
    const token = tokenManager.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      // Decode JWT payload (basic implementation)
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      
      return {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
      };
    } catch (error) {
      console.warn('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupAutoRefresh(): () => void {
    return tokenManager.setupAutoRefresh(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        // Logout on refresh failure
        await this.logout();
        
        // Only redirect if not already on auth pages
        const currentPath = window.location.pathname;
        const isOnAuthPage = currentPath.includes('/login') || 
                           currentPath.includes('/register') ||
                           currentPath.includes('/auth');
        
        if (!isOnAuthPage) {
          window.location.href = '/login';
        }
      }
    });
  }

  /**
   * Add token change listener
   */
  onTokenChange(callback: (tokens: any) => void): () => void {
    return tokenManager.addListener(callback);
  }

  /**
   * Validate current session
   */
  async validateSession(config?: ApiRequestConfig): Promise<boolean> {
    try {
      await this.getCurrentUser(config);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Force token refresh
   */
  async forceRefresh(config?: ApiRequestConfig): Promise<ApiResponse<LoginResponse>> {
    return this.refreshToken(undefined, config);
  }

  /**
   * Get token expiry information
   */
  getTokenInfo(): {
    isValid: boolean;
    expiresAt: number | null;
    timeUntilExpiry: number | null;
    willExpireSoon: boolean;
  } {
    return {
      isValid: tokenManager.isAccessTokenValid(),
      expiresAt: tokenManager.getTokens()?.expiresAt || null,
      timeUntilExpiry: tokenManager.getTimeUntilExpiry(),
      willExpireSoon: tokenManager.willExpireSoon(),
    };
  }
}

// Create and export singleton instance
export const authService = new AuthService();

// Export the class for creating custom instances
export default AuthService;