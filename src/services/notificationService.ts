import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
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
    return (value as { toDate: () => Date }).toDate().toISOString();
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

function cleanPayload(input: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  return clean;
}

export const notificationService = {
  /** Atomically write an in-app notification document. */
  async create(input: Omit<InAppNotification, "id" | "createdAt" | "read">): Promise<string> {
    const db = ensureDb();
    const ref = doc(collection(db, "notifications"));
    await runTransaction(db, async (tx) => {
      tx.set(ref, {
        ...cleanPayload(input as unknown as Record<string, unknown>),
        read: false,
        createdAt: serverTimestamp(),
      });
    });
    return ref.id;
  },

  /**
   * Dual-delivery debt reminder: writes an in-app notification AND an email
   * document compatible with the Firebase "Trigger Email" extension (uses
   * `toUids` so the extension resolves the recipient's Auth email server-side).
   * Both writes happen in a single atomic Firestore transaction.
   */
  async sendDebtReminder(input: {
    groupId: string;
    debtorId: string;
    creditorId: string;
    creditorName?: string;
    groupName?: string;
    message: string;
    amount: number;
    debtId?: string;
  }): Promise<string> {
    const db = ensureDb();
    const notifRef = doc(collection(db, "notifications"));
    const mailRef = doc(collection(db, "mail"));

    const amountFmt = `${input.amount.toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₴`;
    const subject = `Нагадування про борг ${amountFmt}${input.groupName ? ` у "${input.groupName}"` : ""}`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fafafa;color:#111;">
        <h2 style="margin:0 0 12px;">Привіт!</h2>
        <p style="margin:0 0 12px;">
          ${input.creditorName ? `<strong>${input.creditorName}</strong>` : "Кредитор"}
          нагадує про борг <strong>${amountFmt}</strong>${input.groupName ? ` у групі "<strong>${input.groupName}</strong>"` : ""}.
        </p>
        <p style="margin:0 0 16px;color:#555;">${input.message}</p>
        <p style="margin:24px 0 0;font-size:12px;color:#888;">Pay &amp; Split</p>
      </div>`;

    await runTransaction(db, async (tx) => {
      tx.set(notifRef, {
        ...cleanPayload({
          toUserId: input.debtorId,
          fromUserId: input.creditorId,
          groupId: input.groupId,
          debtId: input.debtId,
          type: "remind",
          message: input.message,
          amount: input.amount,
        }),
        read: false,
        createdAt: serverTimestamp(),
      });
      tx.set(mailRef, {
        toUids: [input.debtorId],
        fromUserId: input.creditorId,
        template: {
          name: "debt-reminder",
          data: {
            amount: input.amount,
            amountFormatted: amountFmt,
            groupName: input.groupName ?? "",
            creditorName: input.creditorName ?? "",
            message: input.message,
          },
        },
        message: { subject, html },
        createdAt: serverTimestamp(),
      });
    });

    return notifRef.id;
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
