import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FbUser,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase";
import type { User } from "@/types/database";

function ensureAuth() {
  const { auth, db } = getFirebase();
  if (!auth || !db) throw new Error("Firebase не налаштовано. Додайте ключі у src/lib/firebase.ts");
  return { auth, db };
}

export const authService = {
  isReady: () => isFirebaseConfigured,

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const { auth, db } = ensureAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    const profile: User = {
      id: cred.user.uid,
      email,
      displayName,
      photoURL: cred.user.photoURL ?? undefined,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", cred.user.uid), { ...profile, createdAt: serverTimestamp() });
    return profile;
  },

  async signIn(email: string, password: string) {
    const { auth } = ensureAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  },

  async signOut() {
    const { auth } = ensureAuth();
    await signOut(auth);
  },

  async getProfile(uid: string): Promise<User | null> {
    const { db } = ensureAuth();
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null;
  },

  onAuthChange(cb: (user: FbUser | null) => void) {
    const { auth } = getFirebase();
    if (!auth) {
      cb(null);
      return () => {};
    }
    return onAuthStateChanged(auth, cb);
  },

  /** GDPR: wipe user document. Group cleanup must be handled by Cloud Function. */
  async deleteAccount(uid: string) {
    const { auth, db } = ensureAuth();
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "users", uid));
    if (auth.currentUser?.uid === uid) {
      await auth.currentUser.delete();
    }
  },
};
