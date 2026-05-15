import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { Group as DbGroup } from "@/types/database";
import type { Group as UiGroup, Member } from "@/lib/split";
import { authService } from "./authService";

function ensureDb() {
  const { db } = getFirebase();
  if (!db) throw new Error("Firebase не налаштовано");
  return db;
}

function toIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function normalizeGroup(id: string, data: Record<string, unknown>): DbGroup {
  return {
    id,
    name: String(data.name ?? "Група"),
    emoji: String(data.emoji ?? "👥"),
    creatorId: String(data.creatorId ?? ""),
    members: Array.isArray(data.members) ? (data.members as string[]) : [],
    qrCode: data.qrCode as string | undefined,
    createdAt: toIso(data.createdAt),
    updatedAt: data.updatedAt ? toIso(data.updatedAt) : undefined,
  };
}

export const groupService = {
  async createGroup(input: { name: string; emoji?: string; creatorId: string }): Promise<string> {
    const db = ensureDb();
    const ref = await addDoc(collection(db, "groups"), {
      name: input.name,
      emoji: input.emoji ?? "👥",
      creatorId: input.creatorId,
      members: [input.creatorId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(ref, { qrCode: this.generateJoinLink(ref.id), updatedAt: serverTimestamp() });
    return ref.id;
  },

  generateJoinLink(groupId: string) {
    return typeof window === "undefined" ? `/invite/${groupId}` : `${window.location.origin}/invite/${groupId}`;
  },

  async joinGroup(groupId: string, userId: string) {
    const db = ensureDb();
    await updateDoc(doc(db, "groups", groupId), { members: arrayUnion(userId), updatedAt: serverTimestamp() });
  },

  async addMember(groupId: string, userId: string) {
    const db = ensureDb();
    await updateDoc(doc(db, "groups", groupId), { members: arrayUnion(userId), updatedAt: serverTimestamp() });
  },

  listenUserGroups(userId: string, cb: (groups: DbGroup[]) => void, onError?: (error: Error) => void): Unsubscribe {
    const db = ensureDb();
    const q = query(collection(db, "groups"), where("members", "array-contains", userId));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => normalizeGroup(d.id, d.data()))),
      (error) => onError?.(error),
    );
  },

  listenGroupDetails(groupId: string, cb: (group: DbGroup | null) => void, onError?: (error: Error) => void): Unsubscribe {
    const db = ensureDb();
    return onSnapshot(
      doc(db, "groups", groupId),
      (snap) => cb(snap.exists() ? normalizeGroup(snap.id, snap.data()) : null),
      (error) => onError?.(error),
    );
  },

  async hydrateGroups(groups: DbGroup[]): Promise<UiGroup[]> {
    const ids = groups.flatMap((g) => g.members);
    const profiles = await authService.getPublicUsersByIds(ids);
    return groups.map((g) => {
      const members: Member[] = g.members.map((id) => ({
        id,
        name: profiles[id]?.displayName ?? "Користувач",
        avatar: profiles[id]?.photoURL,
      }));
      return {
        id: g.id,
        name: g.name,
        emoji: g.emoji ?? "👥",
        members,
      };
    });
  },
};
