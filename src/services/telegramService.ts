/**
 * Telegram Bot integration.
 * The bot token must live ONLY in a Cloud Function environment variable.
 * The client invokes a callable function which performs the API call.
 */
import { getFirebase } from "@/lib/firebase";
import type { Transaction } from "@/types/database";

export const telegramService = {
  async linkChat(userId: string, chatId: string) {
    const { functions } = getFirebase();
    if (!functions) throw new Error("Firebase не налаштовано");
    const { httpsCallable } = await import("firebase/functions");
    const fn = httpsCallable(functions, "telegramLinkChat");
    await fn({ userId, chatId });
  },

  async sendDebtAlert(transaction: Transaction, message?: string) {
    const { functions } = getFirebase();
    if (!functions) return;
    const { httpsCallable } = await import("firebase/functions");
    const fn = httpsCallable(functions, "telegramSendDebtAlert");
    await fn({ transaction, message });
  },
};
