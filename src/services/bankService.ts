/**
 * Placeholder for future bank integrations (Monobank / PrivatBank).
 *
 * Real implementations MUST run in a Cloud Function — never expose
 * X-Token / merchant secrets to the client bundle.
 */
import { getFirebase } from "@/lib/firebase";

export type BankProvider = "monobank" | "privatbank";

export interface BankTransaction {
  id: string;
  amount: number; // у копійках
  currencyCode: number; // 980 = UAH
  description: string;
  time: number; // unix seconds
  counterpartyName?: string;
}

export const bankService = {
  /** Open OAuth/Setup flow for a given provider (stub). */
  async connect(_provider: BankProvider): Promise<{ ok: boolean; message: string }> {
    return { ok: false, message: "Інтеграцію з банком буде додано згодом." };
  },

  /** Fetch latest transactions via callable Cloud Function. */
  async fetchTransactions(provider: BankProvider, since: number): Promise<BankTransaction[]> {
    const { functions } = getFirebase();
    if (!functions) return [];
    const { httpsCallable } = await import("firebase/functions");
    const fn = httpsCallable<unknown, BankTransaction[]>(functions, "bankFetchTransactions");
    const res = await fn({ provider, since });
    return res.data ?? [];
  },
};
