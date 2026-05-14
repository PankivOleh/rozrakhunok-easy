import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

/**
 * Firebase configuration.
 *
 * Заповніть значення нижче (або через змінні оточення VITE_FIREBASE_*),
 * щоб увімкнути живе підключення до Firebase.
 *
 * Дізнатись де взяти ключі: Firebase Console → Project settings → Your apps → SDK setup.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyBSdDaBWeWzylte7hOu4kKr49UufXGyTpU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "payandsplit.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "payandsplit",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "payandsplit.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "269029362945",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:269029362945:web:f05c5ec916954a9a051f00",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _functions: Functions | null = null;

export function getFirebase() {
  if (!isFirebaseConfigured) {
    return { app: null, auth: null, db: null, functions: null } as const;
  }
  if (!_app) {
    _app = getApps()[0] ?? initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db = getFirestore(_app);
    _functions = getFunctions(_app);
  }
  return { app: _app, auth: _auth!, db: _db!, functions: _functions! } as const;
}

export const { auth, db, functions } = getFirebase();
