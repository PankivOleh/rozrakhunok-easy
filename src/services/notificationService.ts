import { getFirebase } from "@/lib/firebase";
import type { Expense, Transaction } from "@/types/database";

/**
 * Firebase Cloud Messaging (FCM) wrapper.
 * Token registration runs on the client; sending push notifications
 * must be performed by a Cloud Function (Admin SDK) for security.
 */
export const notificationService = {
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
      const token = await getToken(messaging, { vapidKey });
      return token ?? null;
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
    const messaging = getMessaging(app);
    return onMessage(messaging, cb);
  },

  /**
   * Notify members of a new expense. In production this calls a callable
   * Cloud Function that uses Admin SDK to send to FCM tokens.
   */
  async notifyNewExpense(groupId: string, expense: Omit<Expense, "id" | "timestamp">, settlements: Transaction[]) {
    const { functions } = getFirebase();
    if (!functions) return;
    try {
      const { httpsCallable } = await import("firebase/functions");
      const fn = httpsCallable(functions, "notifyNewExpense");
      await fn({ groupId, expense, settlements });
    } catch (err) {
      console.warn("notifyNewExpense skipped:", err);
    }
  },

  async sendDebtReminder(transaction: Transaction) {
    const { functions } = getFirebase();
    if (!functions) return;
    const { httpsCallable } = await import("firebase/functions");
    const fn = httpsCallable(functions, "sendDebtReminder");
    await fn({ transaction });
  },
};
