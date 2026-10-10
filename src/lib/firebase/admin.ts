import 'server-only';
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  try {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (!projectId?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)) throw new Error('Local emulators require a demo project.');
      initializeApp({ projectId });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n"),
        }),
      });
    } else {
      throw new Error('Firebase Admin credentials are not configured.');
    }
  } catch (error) {
    console.error("Firebase admin initialization error", error);
    throw error;
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
