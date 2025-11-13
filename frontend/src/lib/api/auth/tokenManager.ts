import { AuthTokens } from '../types';

const TOKEN_KEY = 'oneclicktag_auth_tokens';

export class TokenManager {
  private tokens: AuthTokens | null = null;
  private listeners: Array<(tokens: AuthTokens | null) => void> = [];

  constructor() {
    this.loadTokensFromStorage();
    this.setupStorageListener();
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: AuthTokens): void {
    this.tokens = {
      ...tokens,
      expiresAt: Date.now() + (tokens.expiresIn * 1000),
    };
    
    this.saveTokensToStorage();
    this.notifyListeners();
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    if (!this.tokens) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes
    
    if (this.tokens.expiresAt && this.tokens.expiresAt - buffer < now) {
      // Token is expired or about to expire
      return null;
    }

    return this.tokens.accessToken;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.tokens?.refreshToken || null;
  }

  /**
   * Get all tokens
   */
  getTokens(): AuthTokens | null {
    return this.tokens ? { ...this.tokens } : null;
  }

  /**
   * Check if access token is valid
   */
  isAccessTokenValid(): boolean {
    if (!this.tokens) {
      return false;
    }

    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes buffer
    
    return this.tokens.expiresAt ? this.tokens.expiresAt - buffer > now : false;
  }

  /**
   * Check if refresh token exists
   */
  hasRefreshToken(): boolean {
    return !!this.tokens?.refreshToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAccessTokenValid() || this.hasRefreshToken();
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.tokens = null;
    this.removeTokensFromStorage();
    this.notifyListeners();
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  getTimeUntilExpiry(): number | null {
    if (!this.tokens?.expiresAt) {
      return null;
    }

    const now = Date.now();
    const timeUntilExpiry = this.tokens.expiresAt - now;
    
    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Check if token will expire soon (within specified minutes)
   */
  willExpireSoon(minutes: number = 5): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry();
    if (timeUntilExpiry === null) {
      return false;
    }

    const threshold = minutes * 60 * 1000; // Convert to milliseconds
    return timeUntilExpiry < threshold;
  }

  /**
   * Add listener for token changes
   */
  addListener(listener: (tokens: AuthTokens | null) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Remove listener
   */
  removeListener(listener: (tokens: AuthTokens | null) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private loadTokensFromStorage(): void {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored) {
        const tokens = JSON.parse(stored) as AuthTokens;
        
        // Validate token structure
        if (this.isValidTokenStructure(tokens)) {
          this.tokens = tokens;
        } else {
          this.removeTokensFromStorage();
        }
      }
    } catch (error) {
      console.warn('Failed to load tokens from storage:', error);
      this.removeTokensFromStorage();
    }
  }

  private saveTokensToStorage(): void {
    try {
      if (this.tokens) {
        localStorage.setItem(TOKEN_KEY, JSON.stringify(this.tokens));
      } else {
        this.removeTokensFromStorage();
      }
    } catch (error) {
      console.warn('Failed to save tokens to storage:', error);
    }
  }

  private removeTokensFromStorage(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to remove tokens from storage:', error);
    }
  }

  private isValidTokenStructure(tokens: any): tokens is AuthTokens {
    return (
      tokens &&
      typeof tokens === 'object' &&
      typeof tokens.accessToken === 'string' &&
      typeof tokens.refreshToken === 'string' &&
      typeof tokens.expiresIn === 'number' &&
      (typeof tokens.expiresAt === 'number' || tokens.expiresAt === undefined)
    );
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.tokens);
      } catch (error) {
        console.warn('Error in token change listener:', error);
      }
    });
  }

  private setupStorageListener(): void {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === TOKEN_KEY) {
        if (event.newValue) {
          try {
            const tokens = JSON.parse(event.newValue) as AuthTokens;
            if (this.isValidTokenStructure(tokens)) {
              this.tokens = tokens;
              this.notifyListeners();
            }
          } catch (error) {
            console.warn('Failed to parse tokens from storage event:', error);
          }
        } else {
          // Tokens were removed in another tab
          this.tokens = null;
          this.notifyListeners();
        }
      }
    });
  }

  /**
   * Auto-refresh token before it expires
   */
  setupAutoRefresh(refreshCallback: () => Promise<void>): () => void {
    let timeoutId: NodeJS.Timeout | null = null;

    const scheduleRefresh = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const timeUntilExpiry = this.getTimeUntilExpiry();
      if (timeUntilExpiry === null) {
        return;
      }

      // Refresh 5 minutes before expiry
      const refreshTime = Math.max(0, timeUntilExpiry - (5 * 60 * 1000));

      timeoutId = setTimeout(async () => {
        try {
          await refreshCallback();
          scheduleRefresh(); // Schedule next refresh
        } catch (error) {
          console.warn('Auto-refresh failed:', error);
        }
      }, refreshTime);
    };

    // Setup initial refresh
    scheduleRefresh();

    // Listen for token changes to reschedule
    const unsubscribe = this.addListener(() => {
      scheduleRefresh();
    });

    // Return cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
    };
  }

  /**
   * Get debug information about tokens
   */
  getDebugInfo(): {
    hasTokens: boolean;
    isAccessTokenValid: boolean;
    hasRefreshToken: boolean;
    timeUntilExpiry: number | null;
    willExpireSoon: boolean;
  } {
    return {
      hasTokens: !!this.tokens,
      isAccessTokenValid: this.isAccessTokenValid(),
      hasRefreshToken: this.hasRefreshToken(),
      timeUntilExpiry: this.getTimeUntilExpiry(),
      willExpireSoon: this.willExpireSoon(),
    };
  }
}

// Create and export singleton instance
export const tokenManager = new TokenManager();

// Export the class for testing or custom instances
export default TokenManager;