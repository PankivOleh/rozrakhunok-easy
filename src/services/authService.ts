import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FbUser,
} from "firebase/auth";
import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase";
import type { PublicUser, User } from "@/types/database";

export type AppUser = User;

function ensureFirebase() {
  const { auth, db } = getFirebase();
  if (!auth || !db) throw new Error("Firebase не налаштовано. Додайте ключі Firebase у конфігурацію.");
  return { auth, db };
}

function toIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function normalizeUsername(username: string) {
  const clean = username.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9_.]{3,20}$/.test(clean)) {
    throw new Error("Username: 3–20 символів (a-z, 0-9, _ .)");
  }
  return clean;
}

function normalizeUserDoc(uid: string, fbUser: FbUser, data: Record<string, unknown> | undefined): AppUser {
  const displayName = String(data?.displayName ?? fbUser.displayName ?? "Користувач");
  const username = String(data?.username ?? fbUser.email?.split("@")[0] ?? uid.slice(0, 8)).toLowerCase();
  return {
    id: uid,
    email: fbUser.email ?? undefined,
    username,
    usernameLower: String(data?.usernameLower ?? username),
    displayName,
    displayNameLower: String(data?.displayNameLower ?? displayName.toLowerCase()),
    photoURL: (data?.photoURL as string | undefined) ?? fbUser.photoURL ?? undefined,
    createdAt: toIso(data?.createdAt),
    updatedAt: data?.updatedAt ? toIso(data.updatedAt) : undefined,
    contacts: Array.isArray(data?.contacts) ? (data.contacts as string[]) : [],
    favoriteGroups: Array.isArray(data?.favoriteGroups) ? (data.favoriteGroups as string[]) : [],
    monthlyBudget: typeof data?.monthlyBudget === "number" ? data.monthlyBudget : undefined,
    fcmToken: data?.fcmToken as string | undefined,
  };
}

function normalizePublicUser(id: string, data: Record<string, unknown>): PublicUser {
  const displayName = String(data.displayName ?? "Користувач");
  const username = String(data.username ?? id.slice(0, 8)).toLowerCase();
  return {
    id,
    username,
    usernameLower: String(data.usernameLower ?? username),
    displayName,
    displayNameLower: String(data.displayNameLower ?? displayName.toLowerCase()),
    photoURL: data.photoURL as string | undefined,
    createdAt: toIso(data.createdAt),
  };
}

export const authService = {
  isReady: () => isFirebaseConfigured,

  async signUp(email: string, password: string, displayName: string, username: string): Promise<AppUser> {
    const { auth, db } = ensureFirebase();
    const uname = normalizeUsername(username);
    if (password.length < 6) throw new Error("Пароль має містити мінімум 6 символів");

    const usernameRef = doc(db, "usernames", uname);
    const existingUsername = await getDoc(usernameRef);
    if (existingUsername.exists()) throw new Error("Цей username вже зайнятий");

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await updateProfile(cred.user, { displayName });
      await cred.user.getIdToken(true);

      const privateRef = doc(db, "users", cred.user.uid);
      const publicRef = doc(db, "publicUsers", cred.user.uid);
      const privateProfile = {
        username: uname,
        usernameLower: uname,
        displayName,
        displayNameLower: displayName.toLowerCase(),
        photoURL: cred.user.photoURL ?? null,
        contacts: [],
        favoriteGroups: [],
        monthlyBudget: 2000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const publicProfile = {
        username: uname,
        usernameLower: uname,
        displayName,
        displayNameLower: displayName.toLowerCase(),
        photoURL: cred.user.photoURL ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await runTransaction(db, async (tx) => {
        const usernameSnap = await tx.get(usernameRef);
        if (usernameSnap.exists()) throw new Error("Цей username вже зайнятий");
        tx.set(usernameRef, { uid: cred.user.uid, createdAt: serverTimestamp() });
        tx.set(privateRef, privateProfile);
        tx.set(publicRef, publicProfile);
      });

      return normalizeUserDoc(cred.user.uid, cred.user, privateProfile);
    } catch (error) {
      await deleteUser(cred.user).catch(() => undefined);
      throw error;
    }
  },

  async signIn(email: string, password: string) {
    const { auth } = ensureFirebase();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  },

  async signOut() {
    const { auth } = ensureFirebase();
    await signOut(auth);
  },

  onAuthChange(cb: (user: AppUser | null) => void, onError?: (error: Error) => void) {
    const { auth, db } = getFirebase();
    if (!auth || !db) {
      cb(null);
      return () => {};
    }

    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (fbUser) => {
        unsubscribeProfile?.();
        unsubscribeProfile = null;
        if (!fbUser) {
          cb(null);
          return;
        }

        unsubscribeProfile = onSnapshot(
          doc(db, "users", fbUser.uid),
          (snap) => cb(normalizeUserDoc(fbUser.uid, fbUser, snap.data() as Record<string, unknown> | undefined)),
          (error) => {
            onError?.(error);
            cb(normalizeUserDoc(fbUser.uid, fbUser, undefined));
          },
        );
      },
      (error) => {
        onError?.(error);
        cb(null);
      },
    );

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  },

  async updateUser(uid: string, patch: Partial<AppUser>): Promise<void> {
    const { db } = ensureFirebase();
    const allowed: Record<string, unknown> = {};
    if (patch.displayName !== undefined) {
      allowed.displayName = patch.displayName;
      allowed.displayNameLower = patch.displayName.toLowerCase();
    }
    if (patch.contacts !== undefined) allowed.contacts = patch.contacts;
    if (patch.favoriteGroups !== undefined) allowed.favoriteGroups = patch.favoriteGroups;
    if (patch.monthlyBudget !== undefined) allowed.monthlyBudget = patch.monthlyBudget;
    allowed.updatedAt = serverTimestamp();
    await updateDoc(doc(db, "users", uid), allowed);
    if (patch.displayName !== undefined || patch.photoURL !== undefined) {
      const publicPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (patch.displayName !== undefined) {
        publicPatch.displayName = patch.displayName;
        publicPatch.displayNameLower = patch.displayName.toLowerCase();
      }
      if (patch.photoURL !== undefined) publicPatch.photoURL = patch.photoURL;
      await updateDoc(doc(db, "publicUsers", uid), publicPatch);
    }
  },

  async searchUsers(term: string): Promise<PublicUser[]> {
    const { db } = ensureFirebase();
    const clean = term.trim().toLowerCase().replace(/^@/, "");
    if (clean.length < 2) return [];

    const byUsername = query(
      collection(db, "publicUsers"),
      where("usernameLower", ">=", clean),
      where("usernameLower", "<=", `${clean}\uf8ff`),
      limit(10),
    );
    const byName = query(
      collection(db, "publicUsers"),
      where("displayNameLower", ">=", clean),
      where("displayNameLower", "<=", `${clean}\uf8ff`),
      limit(10),
    );
    const [uSnap, nSnap] = await Promise.all([getDocs(byUsername), getDocs(byName)]);
    const map = new Map<string, PublicUser>();
    [...uSnap.docs, ...nSnap.docs].forEach((d) => map.set(d.id, normalizePublicUser(d.id, d.data())));
    return [...map.values()].slice(0, 10);
  },

  async getPublicUsersByIds(ids: string[]): Promise<Record<string, PublicUser>> {
    const { db } = ensureFirebase();
    const unique = [...new Set(ids)].filter(Boolean);
    const entries = await Promise.all(
      unique.map(async (id) => {
        const snap = await getDoc(doc(db, "publicUsers", id));
        return snap.exists() ? ([id, normalizePublicUser(id, snap.data())] as const) : null;
      }),
    );
    return Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, PublicUser]>);
  },

  async deleteAccount(uid: string) {
    const { auth, db } = ensureFirebase();
    const current = auth.currentUser;
    if (!current || current.uid !== uid) throw new Error("Потрібно увійти повторно");

    const profileSnap = await getDoc(doc(db, "users", uid));
    const username = profileSnap.data()?.username as string | undefined;
    const groupsSnap = await getDocs(query(collection(db, "groups"), where("members", "array-contains", uid)));
    const notificationsToMe = await getDocs(query(collection(db, "notifications"), where("toUserId", "==", uid)));
    const notificationsFromMe = await getDocs(query(collection(db, "notifications"), where("fromUserId", "==", uid)));

    const batch = writeBatch(db);
    groupsSnap.docs.forEach((groupDoc) => batch.update(groupDoc.ref, { members: arrayRemove(uid), updatedAt: serverTimestamp() }));
    notificationsToMe.docs.forEach((n) => batch.delete(n.ref));
    notificationsFromMe.docs.forEach((n) => batch.delete(n.ref));
    batch.delete(doc(db, "users", uid));
    batch.delete(doc(db, "publicUsers", uid));
    if (username) batch.delete(doc(db, "usernames", username));
    await batch.commit();
    await deleteUser(current);
  },
};
