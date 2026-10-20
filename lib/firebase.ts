"use client";

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

const requiredConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const config: FirebaseOptions = {
  ...requiredConfig,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Object.values(requiredConfig).every(Boolean);

export type FirebaseServices = {
  auth: Auth;
  db: Firestore;
  functions: Functions;
  storage: FirebaseStorage;
};

let loading: Promise<FirebaseServices | null> | null = null;

export function firebaseServices(): Promise<FirebaseServices | null> {
  if (!firebaseConfigured || typeof window === "undefined") return Promise.resolve(null);
  if (loading) return loading;

  loading = Promise.resolve().then(() => {
    const app = getApps().length ? getApp() : initializeApp(config);
    const localHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (localHost && process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG === "true") {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
    if (siteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }

    const auth = getAuth(app);
    const db = getFirestore(app);
    const functions = getFunctions(app);
    const storage = getStorage(app);

    if (localHost && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      connectStorageEmulator(storage, "127.0.0.1", 9199);
    }

    return { auth, db, functions, storage };
  });

  return loading;
}
