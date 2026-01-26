import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

@Injectable()
export class FirebaseConfig {
  private app: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const serviceAccountKey = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_KEY'
    );
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    let serviceAccount: admin.ServiceAccount;

    // Option 1: Use individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
    if (projectId && clientEmail && privateKey) {
      // Replace escaped newlines with actual newlines (common in env vars)
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      serviceAccount = {
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      };
    }
    // Option 2: Use full JSON service account key
    else if (serviceAccountKey) {
      // Check for placeholder values
      if (
        serviceAccountKey.includes('path/to/') ||
        serviceAccountKey === 'path/to/serviceAccountKey.json'
      ) {
        console.warn(
          'Firebase configuration contains placeholder values. Please set proper credentials.'
        );
        return;
      }

      try {
        // Parse service account key from JSON string or file path
        if (serviceAccountKey.startsWith('{')) {
          serviceAccount = JSON.parse(serviceAccountKey);
        } else {
          // Use absolute path for service account file
          const file = fs.readFileSync(serviceAccountKey) as any;
          serviceAccount = JSON.parse(file);
        }
      } catch (error) {
        console.warn(
          `Firebase configuration error: ${error.message}. Skipping Firebase initialization.`
        );
        return;
      }
    } else {
      console.warn(
        'Firebase configuration is missing. Set either FIREBASE_SERVICE_ACCOUNT_KEY or individual vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).'
      );
      return;
    }

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.warn(
        `Firebase initialization failed: ${error.message}. Continuing without Firebase.`
      );
    }
  }

  getAuth(): admin.auth.Auth | null {
    if (!this.app) {
      console.warn(
        'Firebase is not initialized. Auth operations will not work.'
      );
      return null;
    }
    return this.app.auth();
  }

  getApp(): admin.app.App | null {
    if (!this.app) {
      console.warn('Firebase is not initialized.');
      return null;
    }
    return this.app;
  }

  isInitialized(): boolean {
    return !!this.app;
  }
}
