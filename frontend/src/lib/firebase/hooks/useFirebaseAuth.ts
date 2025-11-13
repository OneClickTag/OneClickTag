import { useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { firebaseAuthService, SignUpData, SignInData } from '../authService';
import { useAuth } from '../../api/hooks/useAuth';

export interface UseFirebaseAuthReturn {
  // State
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      setLoading(false);

      // Don't auto-authenticate on login/register pages to avoid loops
      const isOnAuthPage = window.location.pathname.includes('/login') || 
                          window.location.pathname.includes('/register');

      if (user && !isAuthenticated && !isOnAuthPage) {
        // User is authenticated with Firebase but not with our backend
        try {
          await firebaseAuthService.authenticateWithBackend(user);
        } catch (error) {
          console.error('Failed to authenticate with backend:', error);
          setError('Failed to complete authentication. Please try again.');
        }
      }
    });

    return unsubscribe;
  }, [isAuthenticated]);

  const signUp = useCallback(async (data: SignUpData) => {
    try {
      setLoading(true);
      setError(null);
      sessionStorage.setItem('authInProgress', 'true');
      
      const user = await firebaseAuthService.signUp(data);
      
      // Authenticate with backend
      await firebaseAuthService.authenticateWithBackend(user);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
      sessionStorage.removeItem('authInProgress');
    }
  }, []);

  const signIn = useCallback(async (data: SignInData) => {
    try {
      setLoading(true);
      setError(null);
      sessionStorage.setItem('authInProgress', 'true');
      
      const user = await firebaseAuthService.signIn(data);
      
      // Authenticate with backend
      await firebaseAuthService.authenticateWithBackend(user);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
      sessionStorage.removeItem('authInProgress');
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      sessionStorage.setItem('authInProgress', 'true');
      
      const user = await firebaseAuthService.signInWithGoogle();
      
      // Authenticate with backend
      await firebaseAuthService.authenticateWithBackend(user);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign in failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
      sessionStorage.removeItem('authInProgress');
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Sign out from Firebase
      await firebaseAuthService.signOut();
      
      // Clear backend tokens (this will be handled by auth state change)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    firebaseUser,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    clearError,
  };
}

export default useFirebaseAuth;