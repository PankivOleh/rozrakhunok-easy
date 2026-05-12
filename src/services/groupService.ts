import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { Group, User } from "@/types/database";

function ensureDb() {
  const { db } = getFirebase();
  if (!db) throw new Error("Firebase не налаштовано");
  return db;
}

export const groupService = {
  async createGroup(input: { name: string; emoji?: string; creatorId: string }): Promise<Group> {
    const db = ensureDb();
    const ref = await addDoc(collection(db, "groups"), {
      name: input.name,
      emoji: input.emoji ?? "👥",
      creatorId: input.creatorId,
      members: [input.creatorId],
      createdAt: serverTimestamp(),
    });
    const joinUrl = `${window.location.origin}/groups/${ref.id}/join`;
    await updateDoc(ref, { qrCode: joinUrl });
    return {
      id: ref.id,
      name: input.name,
      emoji: input.emoji,
      creatorId: input.creatorId,
      members: [input.creatorId],
      qrCode: joinUrl,
      createdAt: new Date().toISOString(),
    };
  },

  generateJoinLink(groupId: string) {
    return `${window.location.origin}/groups/${groupId}/join`;
  },

  async joinGroup(groupId: string, userId: string) {
    const db = ensureDb();
    await updateDoc(doc(db, "groups", groupId), { members: arrayUnion(userId) });
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const db = ensureDb();
    const snap = await getDoc(doc(db, "groups", groupId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
  },

  async getMembers(groupId: string): Promise<User[]> {
    const db = ensureDb();
    const group = await this.getGroup(groupId);
    if (!group?.members?.length) return [];
    const out: User[] = [];
    for (const uid of group.members) {
      const s = await getDoc(doc(db, "users", uid));
      if (s.exists()) out.push({ id: s.id, ...s.data() } as User);
    }
    return out;
  },

  listenUserGroups(userId: string, cb: (groups: Group[]) => void) {
    const db = ensureDb();
    const q = query(collection(db, "groups"), where("members", "array-contains", userId));
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group));
    });
  },

  async listUserGroups(userId: string): Promise<Group[]> {
    const db = ensureDb();
    const q = query(collection(db, "groups"), where("members", "array-contains", userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group);
  },
};
