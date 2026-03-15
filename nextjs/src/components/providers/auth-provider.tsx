'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, getIdToken, logout as firebaseLogout } from '@/lib/auth/firebase-client';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  loading: boolean;
  tokenReady: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  loginWithGoogle: (turnstileToken?: string) => Promise<void>;
  register: (email: string, password: string, name: string, turnstileToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Helper function to authenticate with backend API using Firebase ID token
 * @param idToken Firebase ID token
 * @param turnstileToken Optional Turnstile verification token
 * @returns User data and access token from backend
 */
async function authenticateWithBackend(
  idToken: string,
  turnstileToken?: string
): Promise<{ user: AuthUser; accessToken: string }> {
  const body: Record<string, string> = { idToken };
  if (turnstileToken) {
    body.turnstileToken = turnstileToken;
  }

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}

// Cache key for persisted auth session
const AUTH_CACHE_KEY = 'oneclicktag_auth_session';

function getCachedSession(): { user: AuthUser; accessToken: string; cachedAt: number } | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Cache valid for 30 minutes
    if (Date.now() - parsed.cachedAt > 30 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCachedSession(user: AuthUser, accessToken: string) {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, accessToken, cachedAt: Date.now() }));
  } catch { /* ignore */ }
}

function clearCachedSession() {
  try { localStorage.removeItem(AUTH_CACHE_KEY); } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const restoredFromCache = useRef(false);
  const firebaseUserRef = useRef<User | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  // Instantly restore from localStorage cache on mount — runs before Firebase SDK init
  useEffect(() => {
    const cached = getCachedSession();
    if (cached) {
      document.cookie = `auth-token=${cached.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
      setUser(cached.user);
      setLoading(false);
      restoredFromCache.current = true;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);
      firebaseUserRef.current = fbUser;
      setTokenReady(true);

      if (fbUser) {
        try {
          // Authenticate with backend (background refresh if cached, blocking if not)
          const idToken = await fbUser.getIdToken();
          const data = await authenticateWithBackend(idToken);
          document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
          setCachedSession(data.user, data.accessToken);
          setUser(data.user);
        } catch (error) {
          // If we restored from cache, keep it — don't log them out for a transient failure
          if (!restoredFromCache.current) {
            console.error('Failed to authenticate with backend:', error);
            document.cookie = 'auth-token=; path=/; max-age=0';
            clearCachedSession();
            setUser(null);
          }
        }
      } else {
        document.cookie = 'auth-token=; path=/; max-age=0';
        clearCachedSession();
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, turnstileToken?: string) => {
    const { loginWithEmail } = await import('@/lib/auth/firebase-client');
    const userCredential = await loginWithEmail(email, password);
    const idToken = await userCredential.user.getIdToken();

    const data = await authenticateWithBackend(idToken, turnstileToken);
    document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
    setCachedSession(data.user, data.accessToken);
    setUser(data.user);
  };

  const loginWithGoogle = async (turnstileToken?: string) => {
    const { loginWithGoogle: firebaseLoginWithGoogle } = await import('@/lib/auth/firebase-client');
    const userCredential = await firebaseLoginWithGoogle();
    const idToken = await userCredential.user.getIdToken();

    const data = await authenticateWithBackend(idToken, turnstileToken);
    document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
    setCachedSession(data.user, data.accessToken);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string, turnstileToken?: string) => {
    const { registerWithEmail } = await import('@/lib/auth/firebase-client');
    const userCredential = await registerWithEmail(email, password, name);
    const idToken = await userCredential.user.getIdToken();

    // Register with backend
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken, name, email, turnstileToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register with backend');
    }

    const data = await response.json();
    // Set auth cookie for middleware
    document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
    setUser(data.user);
  };

  const logout = async () => {
    await firebaseLogout();
    document.cookie = 'auth-token=; path=/; max-age=0';
    clearCachedSession();
    setUser(null);
    setFirebaseUser(null);
  };

  const getToken = async () => {
    // Try Firebase's current user first, fall back to ref
    const token = await getIdToken();
    if (token) return token;
    if (firebaseUserRef.current) return firebaseUserRef.current.getIdToken();
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        tokenReady,
        login,
        loginWithGoogle,
        register,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
