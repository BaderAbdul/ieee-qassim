import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const getAuthDomain = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    // When served over production domains (like ieeequ.online or custom vercel domains),
    // proxying auth requests through the same origin prevents iOS Safari third-party storage partitioning.
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return host;
    }
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: getAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
// Opt-in local testing can never be pointed at a real Firebase project.
if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === 'true') {
  if (!firebaseConfig.projectId?.startsWith('demo-')) throw new Error('Emulators require a demo Firebase project.');
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
// Kept as a compatibility argument for the same-origin backend client.
export const functions = null;
export const storage = getStorage(app);

// Setup Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
// We'll restrict domain later during the sign-in flow or via custom params
// googleProvider.setCustomParameters({ hd: "university.edu" });

export default app;
