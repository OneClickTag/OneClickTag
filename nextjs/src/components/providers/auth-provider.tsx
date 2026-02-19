'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  loginWithGoogle: (turnstileToken?: string) => Promise<void>;
  register: (email: string, password: string, name: string, turnstileToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          // Get Firebase ID token and authenticate with backend
          const idToken = await fbUser.getIdToken();
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });

          if (response.ok) {
            const data = await response.json();
            // Set auth cookie for middleware
            document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
            setUser(data.user);
          } else {
            console.error('Backend auth failed, response:', await response.text());
            document.cookie = 'auth-token=; path=/; max-age=0'; // Clear cookie
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to authenticate with backend:', error);
          document.cookie = 'auth-token=; path=/; max-age=0'; // Clear cookie
          setUser(null);
        }
      } else {
        document.cookie = 'auth-token=; path=/; max-age=0'; // Clear cookie
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

    // Authenticate with backend
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken, turnstileToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to authenticate with backend');
    }

    const data = await response.json();
    // Set auth cookie for middleware
    document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
    setUser(data.user);
  };

  const loginWithGoogle = async (turnstileToken?: string) => {
    const { loginWithGoogle: firebaseLoginWithGoogle } = await import('@/lib/auth/firebase-client');
    const userCredential = await firebaseLoginWithGoogle();
    const idToken = await userCredential.user.getIdToken();

    // Authenticate with backend
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken, turnstileToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to authenticate with backend');
    }

    const data = await response.json();
    // Set auth cookie for middleware
    document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
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
    document.cookie = 'auth-token=; path=/; max-age=0'; // Clear cookie
    setUser(null);
    setFirebaseUser(null);
  };

  const getToken = async () => {
    return getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
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
