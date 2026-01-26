import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  AuthError,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from './config';
import { apiClient } from '../api/client';
import { apiEndpoints } from '../api/config';
import { tokenManager } from '../api/auth/tokenManager';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export class FirebaseAuthService {
  /**
   * Sign up with email and password
   */
  async signUp({ email, password, name }: SignUpData): Promise<FirebaseUser> {
    try {
      // Create user account with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      return userCredential.user;
    } catch (error) {
      console.error('Firebase sign up error:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }: SignInData): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Firebase sign in error:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<FirebaseUser> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Get current Firebase user
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Get Firebase ID token
   */
  async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    const user = this.getCurrentUser();
    if (!user) return null;

    try {
      return await user.getIdToken(forceRefresh);
    } catch (error) {
      console.error('Get ID token error:', error);
      return null;
    }
  }

  /**
   * Authenticate with backend using Firebase token
   */
  async authenticateWithBackend(user: FirebaseUser): Promise<void> {
    try {
      // Get Firebase ID token
      const idToken = await user.getIdToken();

      console.log('[Auth] Authenticating with backend...', {
        uid: user.uid,
        email: user.email,
        tokenLength: idToken.length
      });

      // Send to backend for authentication directly
      const response = await apiClient.post(apiEndpoints.auth.firebase, {
        idToken,
        tenantId: null, // Will be set later if needed
      }, { skipAuth: true });

      console.log('[Auth] Backend response:', {
        hasAccessToken: !!response.data?.accessToken,
        hasRefreshToken: !!response.data?.refreshToken,
        expiresIn: response.data?.expiresIn
      });

      if (response.data && response.data.accessToken) {
        // Store tokens manually
        tokenManager.setTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresIn: response.data.expiresIn || 900, // 15 minutes default
          expiresAt: Date.now() + ((response.data.expiresIn || 900) * 1000),
        });

        // Set auth token in client
        apiClient.setAuthToken(response.data.accessToken);
        console.log('[Auth] Successfully authenticated with backend');
      } else {
        throw new Error('No access token received from backend');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message ||
                          error?.message ||
                          'Backend authentication failed';
      const statusCode = error?.response?.status;

      console.error('[Auth] Backend authentication error:', {
        message: errorMessage,
        statusCode,
        fullError: error
      });

      throw new Error(`Backend authentication failed: ${errorMessage}`);
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: AuthError): Error {
    let message: string;

    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;
      case 'auth/email-already-in-use':
        message = 'An account with this email already exists.';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Sign-in was cancelled.';
        break;
      case 'auth/popup-blocked':
        message = 'Sign-in popup was blocked. Please enable popups and try again.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection.';
        break;
      default:
        message = error.message || 'An error occurred during authentication.';
    }

    return new Error(message);
  }
}

// Create and export singleton instance
export const firebaseAuthService = new FirebaseAuthService();

// Export the class for testing or custom instances
export default FirebaseAuthService;