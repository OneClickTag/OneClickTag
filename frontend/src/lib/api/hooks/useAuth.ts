import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { tokenManager } from '../auth/tokenManager';
import { useApiMutation, useApiQuery } from './useApi';
import {
  LoginRequest,
  LoginResponse,
  AuthTokens,
  ApiRequestConfig,
} from '../types';

// Auth query keys
const AUTH_KEYS = {
  user: ['auth', 'user'] as const,
  session: ['auth', 'session'] as const,
} as const;

/**
 * Hook for user authentication state
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => authService.isAuthenticated());
  const [tokens, setTokens] = React.useState<AuthTokens | null>(() => tokenManager.getTokens());
  const queryClient = useQueryClient();

  // Listen for token changes
  React.useEffect(() => {
    const unsubscribe = tokenManager.addListener((newTokens) => {
      setTokens(newTokens);
      setIsAuthenticated(!!newTokens && tokenManager.isAccessTokenValid());
      
      if (!newTokens) {
        // Clear user data when tokens are cleared
        queryClient.removeQueries({ queryKey: AUTH_KEYS.user });
        queryClient.removeQueries({ queryKey: AUTH_KEYS.session });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return {
    isAuthenticated,
    tokens,
    user: authService.getCurrentUserFromToken(),
    tokenInfo: authService.getTokenInfo(),
  };
}

/**
 * Hook for login mutation
 */
export function useLogin(config?: ApiRequestConfig) {
  const queryClient = useQueryClient();

  return useApiMutation<LoginResponse, any, LoginRequest>(
    (credentials) => authService.login(credentials, config),
    {
      onSuccess: (response) => {
        // Invalidate and refetch user data
        queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
        queryClient.invalidateQueries({ queryKey: AUTH_KEYS.session });
        
        // Set user data in cache
        if (response.data.user) {
          queryClient.setQueryData(AUTH_KEYS.user, response.data.user);
        }
      },
    }
  );
}

/**
 * Hook for logout mutation
 */
export function useLogout(config?: ApiRequestConfig) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(config),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      
      // Redirect to login page
      window.location.href = '/login';
    },
  });
}

/**
 * Hook for token refresh
 */
export function useRefreshToken(config?: ApiRequestConfig) {
  return useApiMutation<LoginResponse, any, void>(
    () => authService.refreshToken(undefined, config)
  );
}

/**
 * Hook for getting current user
 */
export function useCurrentUser(options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}) {
  const { isAuthenticated } = useAuth();

  return useApiQuery(
    [...AUTH_KEYS.user],
    () => authService.getCurrentUser(),
    {
      enabled: isAuthenticated && (options?.enabled !== false),
      staleTime: options?.staleTime || 5 * 60 * 1000,
      refetchOnWindowFocus: options?.refetchOnWindowFocus !== false,
      retry: false,
    }
  );
}

/**
 * Hook for session validation
 */
export function useSessionValidation() {
  const { isAuthenticated } = useAuth();
  const _queryClient = useQueryClient();

  return useQuery({
    queryKey: AUTH_KEYS.session,
    queryFn: () => authService.validateSession(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: false,
  });
}

/**
 * Hook for auto token refresh setup
 */
export function useAutoRefresh() {
  React.useEffect(() => {
    const cleanup = authService.setupAutoRefresh();
    return cleanup;
  }, []);
}

/**
 * Hook for protected routes
 */
export function useRequireAuth(options?: {
  redirectTo?: string;
  requireRoles?: string[];
}) {
  const { isAuthenticated, user } = useAuth();
  const { data: currentUser } = useCurrentUser({ enabled: isAuthenticated });

  React.useEffect(() => {
    if (!isAuthenticated) {
      const redirectTo = options?.redirectTo || '/login';
      const currentPath = window.location.pathname;
      
      // Save current path for redirect after login
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      
      window.location.href = redirectTo;
      return;
    }

    // Check role requirements
    if (options?.requireRoles && currentUser) {
      const hasRequiredRole = options.requireRoles.includes(currentUser.role);
      if (!hasRequiredRole) {
        window.location.href = '/unauthorized';
        return;
      }
    }
  }, [isAuthenticated, currentUser, options?.redirectTo, options?.requireRoles]);

  return {
    isAuthenticated,
    user: currentUser || user,
    loading: isAuthenticated && !currentUser,
  };
}

/**
 * Hook for role-based access control
 */
export function usePermissions() {
  const { user } = useAuth();
  const { data: currentUser } = useCurrentUser();

  const userData = currentUser || user;

  const hasRole = React.useCallback(
    (role: string | string[]): boolean => {
      if (!userData?.role) return false;
      
      if (Array.isArray(role)) {
        return role.includes(userData.role);
      }
      
      return userData.role === role;
    },
    [userData?.role]
  );

  const isAdmin = React.useCallback(
    (): boolean => hasRole('admin'),
    [hasRole]
  );

  const canAccess = React.useCallback(
    (requiredRoles: string | string[]): boolean => {
      return hasRole(requiredRoles);
    },
    [hasRole]
  );

  return {
    user: userData,
    hasRole,
    isAdmin,
    canAccess,
  };
}

/**
 * Hook for login redirect handling
 */
export function useLoginRedirect() {
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath && redirectPath !== '/login') {
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectPath;
      } else {
        window.location.href = '/dashboard';
      }
    }
  }, [isAuthenticated]);
}

/**
 * Hook for auth error handling
 */
export function useAuthErrorHandler() {
  const logout = useLogout();

  React.useEffect(() => {
    const _handleAuthError = (error: any) => {
      if (error.code === 'UNAUTHORIZED' || error.status === 401) {
        logout.mutate();
      } else if (error.code === 'FORBIDDEN' || error.status === 403) {
        window.location.href = '/unauthorized';
      }
    };

    return () => {
    };
  }, [logout]);
}

/**
 * Hook for auth state persistence
 */
export function useAuthPersistence() {
  const { isAuthenticated, tokens } = useAuth();

  React.useEffect(() => {
    // Handle page refresh/reload
    const handleBeforeUnload = () => {
      if (isAuthenticated && tokens) {
        // Tokens are already persisted by tokenManager
        sessionStorage.setItem('wasAuthenticated', 'true');
      }
    };

    // Handle page load
    const handleLoad = () => {
      const wasAuthenticated = sessionStorage.getItem('wasAuthenticated');
      if (wasAuthenticated && !isAuthenticated) {
        // User was authenticated before page reload but isn't now
        // This might indicate a token issue
        sessionStorage.removeItem('wasAuthenticated');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handleLoad);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
    };
  }, [isAuthenticated, tokens]);
}