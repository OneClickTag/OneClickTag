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

    // Check for placeholder values or missing configuration
    if (
      !serviceAccountKey ||
      !projectId ||
      serviceAccountKey.includes('path/to/') ||
      projectId.includes('your-firebase-project-id') ||
      serviceAccountKey === 'path/to/serviceAccountKey.json'
    ) {
      console.warn(
        'Firebase configuration is missing or contains placeholder values. Please set FIREBASE_SERVICE_ACCOUNT_KEY and FIREBASE_PROJECT_ID for production use.'
      );
      return; // Skip Firebase initialization in development
    }

    let serviceAccount: admin.ServiceAccount;

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
      return; // Skip Firebase initialization instead of throwing
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
