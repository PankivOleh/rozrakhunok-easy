import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { InAppNotification } from "@/types/database";

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

function normalizeNotification(id: string, data: Record<string, unknown>): InAppNotification {
  return {
    id,
    toUserId: String(data.toUserId ?? ""),
    fromUserId: String(data.fromUserId ?? ""),
    groupId: data.groupId as string | undefined,
    debtId: data.debtId as string | undefined,
    type: (data.type as InAppNotification["type"]) ?? "remind",
    message: String(data.message ?? "Сповіщення"),
    amount: typeof data.amount === "number" ? data.amount : undefined,
    read: Boolean(data.read),
    createdAt: toIso(data.createdAt),
  };
}

export const notificationService = {
  async create(input: Omit<InAppNotification, "id" | "createdAt" | "read">): Promise<string> {
    const db = ensureDb();
    const clean: Record<string, unknown> = { read: false, createdAt: serverTimestamp() };
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
    const ref = await addDoc(collection(db, "notifications"), clean);
    return ref.id;
  },

  async sendDebtReminder(input: {
    groupId: string;
    debtorId: string;
    creditorId: string;
    message: string;
    amount: number;
    debtId?: string;
  }): Promise<string> {
    return this.create({
      toUserId: input.debtorId,
      fromUserId: input.creditorId,
      groupId: input.groupId,
      debtId: input.debtId,
      type: "remind",
      message: input.message,
      amount: input.amount,
    });
  },

  listenUserNotifications(userId: string, cb: (notifications: InAppNotification[]) => void, onError?: (error: Error) => void): Unsubscribe {
    const db = ensureDb();
    const q = query(collection(db, "notifications"), where("toUserId", "==", userId), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => normalizeNotification(d.id, d.data()))),
      (error) => onError?.(error),
    );
  },

  async markAllRead(notifications: InAppNotification[]) {
    const db = ensureDb();
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
  },

  async clearUserNotifications(userId: string, notifications: InAppNotification[]) {
    const db = ensureDb();
    await Promise.all(notifications.filter((n) => n.toUserId === userId).map((n) => deleteDoc(doc(db, "notifications", n.id))));
  },

  /** Request browser notification permission and obtain an FCM token. */
  async requestPermissionAndToken(vapidKey: string): Promise<string | null> {
    if (typeof window === "undefined" || !("Notification" in window)) return null;
    const { app } = getFirebase();
    if (!app) return null;
    try {
      const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
      if (!(await isSupported())) return null;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return null;
      const messaging = getMessaging(app);
      return (await getToken(messaging, { vapidKey })) ?? null;
    } catch (err) {
      console.error("FCM token error:", err);
      return null;
    }
  },

  async onForegroundMessage(cb: (payload: unknown) => void) {
    const { app } = getFirebase();
    if (!app) return () => {};
    const { getMessaging, onMessage, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return () => {};
    return onMessage(getMessaging(app), cb);
  },
};
