import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let firebaseApp: App | undefined;
let firebaseAuth: Auth | undefined;

function getFirebaseAdmin() {
  if (!firebaseApp && getApps().length === 0) {
    // Check for service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    if (serviceAccount) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // Fall back to environment variables
      firebaseApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  } else if (!firebaseApp) {
    firebaseApp = getApps()[0];
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }

  return { app: firebaseApp, auth: firebaseAuth };
}

export const verifyIdToken = async (token: string) => {
  const { auth } = getFirebaseAdmin();
  return auth.verifyIdToken(token);
};

export const getUser = async (uid: string) => {
  const { auth } = getFirebaseAdmin();
  return auth.getUser(uid);
};

export const deleteUser = async (uid: string) => {
  const { auth } = getFirebaseAdmin();
  return auth.deleteUser(uid);
};

export { getFirebaseAdmin };
