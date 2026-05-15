import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
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
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function normalizeReminder(id: string, data: Record<string, unknown>): ScheduledReminder {
  return {
    id,
    groupId: String(data.groupId ?? ""),
    creditorId: String(data.creditorId ?? ""),
    debtorId: String(data.debtorId ?? ""),
    amount: typeof data.amount === "number" ? data.amount : undefined,
    frequency: data.reminderFrequency === "daily" || data.reminderFrequency === "monthly" ? data.reminderFrequency : "weekly",
    lastRemindedAt: data.lastRemindedAt ? toIso(data.lastRemindedAt) : null,
    createdAt: toIso(data.createdAt),
  };
}

export const reminderService = {
  async upsertReminder(input: Omit<ScheduledReminder, "id" | "createdAt" | "lastRemindedAt"> & { amount?: number }): Promise<string> {
    const db = ensureDb();
    const ref = await addDoc(collection(db, "groups", input.groupId, "debtReminders"), {
      creditorId: input.creditorId,
      debtorId: input.debtorId,
      amount: input.amount ?? 0,
      reminderFrequency: input.frequency,
      lastRemindedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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

  listenUserConfiguredReminders(userId: string, cb: (reminders: ScheduledReminder[]) => void, onError?: (error: Error) => void): Unsubscribe {
    const db = ensureDb();
    const q = query(collection(db, "groupDebtReminders"), where("creditorId", "==", userId));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => normalizeReminder(d.id, d.data()))),
      (error) => onError?.(error),
    );
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
