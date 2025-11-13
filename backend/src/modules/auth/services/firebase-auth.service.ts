import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseConfig } from '../config/firebase.config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthService {
  constructor(private firebaseConfig: FirebaseConfig) {}

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const auth = this.firebaseConfig.getAuth();
      console.log('auth', auth);
      if (!auth) {
        throw new UnauthorizedException('Firebase is not configured');
      }
      const decodedToken = await auth.verifyIdToken(idToken);
      console.log('decodedToken', decodedToken);
      return decodedToken;
    } catch (error) {
      throw new UnauthorizedException(
        `Invalid Firebase token: ${error.message}`
      );
    }
  }

  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      const auth = this.firebaseConfig.getAuth();
      if (!auth) {
        throw new UnauthorizedException('Firebase is not configured');
      }
      return await auth.getUser(uid);
    } catch (error) {
      throw new UnauthorizedException(
        `Firebase user not found: ${error.message}`
      );
    }
  }

  async createCustomToken(
    uid: string,
    additionalClaims?: object
  ): Promise<string> {
    try {
      const auth = this.firebaseConfig.getAuth();
      if (!auth) {
        throw new Error('Firebase is not configured');
      }
      return await auth.createCustomToken(uid, additionalClaims);
    } catch (error) {
      throw new Error(`Failed to create custom token: ${error.message}`);
    }
  }

  async setCustomUserClaims(uid: string, customClaims: object): Promise<void> {
    try {
      const auth = this.firebaseConfig.getAuth();
      if (!auth) {
        throw new Error('Firebase is not configured');
      }
      await auth.setCustomUserClaims(uid, customClaims);
    } catch (error) {
      throw new Error(`Failed to set custom claims: ${error.message}`);
    }
  }
}
