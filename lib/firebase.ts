"use client";

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type AuthProvider,
  type User,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type QuerySnapshot,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { connectStorageEmulator, getDownloadURL, getStorage, ref, uploadBytes, type FirebaseStorage } from "firebase/storage";

export type CompatUser = User;
type CompatSnapshot = { docs: { id: string; data(): Record<string, unknown> }[] };
type CompatDocumentSnapshot = { exists: boolean; data(): Record<string, unknown> | undefined };
type CompatDocument = {
  get(): Promise<CompatDocumentSnapshot>;
  onSnapshot(next: (snapshot: CompatDocumentSnapshot) => void, error?: (error: unknown) => void): () => void;
  set(data: Record<string, unknown>, options?: { merge: boolean }): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
};
type CompatCollection = {
  doc(id?: string): CompatDocument;
  get(): Promise<CompatSnapshot>;
  orderBy(field: string, direction?: "asc" | "desc"): { get(): Promise<CompatSnapshot> };
};
type CompatAuth = {
  readonly currentUser: CompatUser | null;
  onAuthStateChanged(callback: (user: CompatUser | null) => void): () => void;
  signInWithPopup(provider: unknown): Promise<unknown>;
  signOut(): Promise<void>;
  useEmulator(url: string, options?: { disableWarnings: boolean }): void;
};
type CompatFirestore = { collection(name: string): CompatCollection; useEmulator(host: string, port: number): void };
type CompatFunctions = { httpsCallable(name: string): (data: unknown) => Promise<unknown>; useEmulator(host: string, port: number): void };
type CompatStorage = {
  ref(path: string): {
    put(file: File, metadata?: { contentType?: string }): Promise<{ ref: { getDownloadURL(): Promise<string> } }>;
  };
  useEmulator(host: string, port: number): void;
};
type FirebaseFacade = {
  auth: { GoogleAuthProvider: typeof GoogleAuthProvider };
  firestore: { FieldValue: { serverTimestamp: typeof serverTimestamp } };
};

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
let loading: Promise<FirebaseServices | null> | null = null;

function wrapDocumentSnapshot(snapshot: { exists(): boolean; data(): DocumentData | undefined }): CompatDocumentSnapshot {
  return {
    exists: snapshot.exists(),
    data: () => snapshot.data() as Record<string, unknown> | undefined,
  };
}

function wrapQuerySnapshot(snapshot: QuerySnapshot<DocumentData>): CompatSnapshot {
  return {
    docs: snapshot.docs.map((item) => ({
      id: item.id,
      data: () => item.data() as Record<string, unknown>,
    })),
  };
}

function documentAdapter(reference: DocumentReference<DocumentData>): CompatDocument {
  return {
    async get() {
      return wrapDocumentSnapshot(await getDoc(reference));
    },
    onSnapshot(next, error) {
      return onSnapshot(reference, (snapshot) => next(wrapDocumentSnapshot(snapshot)), error);
    },
    async set(data, options) {
      if (options) await setDoc(reference, data, { merge: options.merge });
      else await setDoc(reference, data);
    },
    async update(data) {
      await updateDoc(reference, data);
    },
    async delete() {
      await deleteDoc(reference);
    },
  };
}

function firestoreAdapter(db: Firestore): CompatFirestore {
  return {
    collection(name) {
      const reference = collection(db, name);
      return {
        doc(id) {
          return documentAdapter(id ? doc(db, name, id) : doc(reference));
        },
        async get() {
          return wrapQuerySnapshot(await getDocs(reference));
        },
        orderBy(field, direction = "asc") {
          return {
            async get() {
              return wrapQuerySnapshot(await getDocs(query(reference, orderBy(field, direction))));
            },
          };
        },
      };
    },
    useEmulator(host, port) {
      connectFirestoreEmulator(db, host, port);
    },
  };
}

function authAdapter(auth: Auth): CompatAuth {
  return {
    get currentUser() {
      return auth.currentUser;
    },
    onAuthStateChanged(callback) {
      return onAuthStateChanged(auth, callback);
    },
    signInWithPopup(provider) {
      return signInWithPopup(auth, provider as AuthProvider);
    },
    signOut() {
      return signOut(auth);
    },
    useEmulator(url, options) {
      connectAuthEmulator(auth, url, options);
    },
  };
}

function functionsAdapter(functions: Functions): CompatFunctions {
  return {
    httpsCallable(name) {
      const callable = httpsCallable(functions, name);
      return (data) => callable(data);
    },
    useEmulator(host, port) {
      connectFunctionsEmulator(functions, host, port);
    },
  };
}

function storageAdapter(storage: FirebaseStorage): CompatStorage {
  return {
    ref(path) {
      const storageRef = ref(storage, path);
      return {
        async put(file, metadata) {
          const snapshot = await uploadBytes(storageRef, file, metadata);
          return { ref: { getDownloadURL: () => getDownloadURL(snapshot.ref) } };
        },
      };
    },
    useEmulator(host, port) {
      connectStorageEmulator(storage, host, port);
    },
  };
}

export type FirebaseServices = {
  firebase: FirebaseFacade;
  auth: CompatAuth;
  db: CompatFirestore;
  functions: CompatFunctions;
  storage: CompatStorage;
};

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

    return {
      firebase: {
        auth: { GoogleAuthProvider },
        firestore: { FieldValue: { serverTimestamp } },
      },
      auth: authAdapter(auth),
      db: firestoreAdapter(db),
      functions: functionsAdapter(functions),
      storage: storageAdapter(storage),
    };
  });

  return loading;
}
