import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { ScheduledReminder } from "@/lib/split";

function ensureDb() {
  const { db } = getFirebase();
  if (!db) throw new Error("Firebase не налаштовано");
  return db;
}

function toIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function normalizeReminder(id: string, data: Record<string, unknown>): ScheduledReminder {
  const intervalDays = typeof data.intervalDays === "number"
    ? data.intervalDays
    : data.reminderFrequency === "daily" ? 1
    : data.reminderFrequency === "monthly" ? 30
    : 7;
  return {
    id,
    groupId: String(data.groupId ?? ""),
    creditorId: String(data.creditorId ?? ""),
    debtorId: String(data.debtorId ?? ""),
    amount: typeof data.amount === "number" ? data.amount : undefined,
    intervalDays,
    frequency: intervalDays === 1 ? "daily" : intervalDays >= 30 ? "monthly" : "weekly",
    lastRemindedAt: data.lastRemindedAt ? toIso(data.lastRemindedAt) : null,
    createdAt: toIso(data.createdAt),
  };
}

export const reminderService = {
  async upsertReminder(input: {
    groupId: string;
    creditorId: string;
    debtorId: string;
    intervalDays: number;
    amount?: number;
    debtId?: string;
  }): Promise<string> {
    const db = ensureDb();
    const payload: Record<string, unknown> = {
      creditorId: input.creditorId,
      debtorId: input.debtorId,
      amount: input.amount ?? 0,
      intervalDays: input.intervalDays,
      lastRemindedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.debtId) payload.debtId = input.debtId;
    const ref = await addDoc(collection(db, "groups", input.groupId, "debtReminders"), payload);
    return ref.id;
  },

  async updateLastReminded(groupId: string, reminderId: string) {
    const db = ensureDb();
    await updateDoc(doc(db, "groups", groupId, "debtReminders", reminderId), {
      lastRemindedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async cancelReminder(groupId: string, reminderId: string) {
    const db = ensureDb();
    await deleteDoc(doc(db, "groups", groupId, "debtReminders", reminderId));
  },

  listenGroupReminders(groupId: string, cb: (reminders: ScheduledReminder[]) => void, onError?: (error: Error) => void): Unsubscribe {
    const db = ensureDb();
    const q = query(collection(db, "groups", groupId, "debtReminders"));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => normalizeReminder(d.id, { ...d.data(), groupId }))),
      (error) => onError?.(error),
    );
  },
};
