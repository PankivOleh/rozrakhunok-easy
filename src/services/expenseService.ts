import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { Expense, SettlementRecord } from "@/lib/split";

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

function normalizeExpense(id: string, data: Record<string, unknown>, groupId: string): Expense {
  const timestamp = toIso(data.timestamp ?? data.date);
  return {
    id,
    groupId,
    description: String(data.description ?? "Витрата"),
    amount: Number(data.amount ?? 0),
    payerId: String(data.payerId ?? ""),
    splitType: data.splitType === "unequal" ? "unequal" : "equal",
    shares: data.shares as Record<string, number> | undefined,
    recurring: Boolean(data.recurring),
    participants: Array.isArray(data.participants) ? (data.participants as string[]) : undefined,
    date: timestamp.slice(0, 10),
  };
}

function normalizeSettlement(id: string, data: Record<string, unknown>, groupId: string): SettlementRecord {
  return {
    id,
    groupId,
    fromId: String(data.fromId ?? ""),
    toId: String(data.toId ?? ""),
    amount: Number(data.amount ?? 0),
    date: toIso(data.timestamp ?? data.date).slice(0, 10),
  };
}

export const expenseService = {
  async addExpense(expense: Omit<Expense, "id" | "date"> & { createdBy: string; date?: string }): Promise<string> {
    const db = ensureDb();
    const ref = await addDoc(collection(db, "groups", expense.groupId, "expenses"), {
      description: expense.description,
      amount: expense.amount,
      payerId: expense.payerId,
      splitType: expense.splitType,
      shares: expense.shares ?? null,
      recurring: expense.recurring ?? false,
      participants: expense.participants ?? [],
      createdBy: expense.createdBy,
      timestamp: serverTimestamp(),
    });
    return ref.id;
  },

  listenGroupExpenses(groupId: string, cb: (expenses: Expense[]) => void, onError?: (error: Error) => void): Unsubscribe {
    const db = ensureDb();
    const q = query(collection(db, "groups", groupId, "expenses"), orderBy("timestamp", "desc"));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => normalizeExpense(d.id, d.data(), groupId))),
      (error) => onError?.(error),
    );
  },

  async settleDebt(input: { groupId: string; fromId: string; toId: string; amount: number; createdBy: string }): Promise<string> {
    const db = ensureDb();
    const ref = await addDoc(collection(db, "groups", input.groupId, "settlements"), {
      fromId: input.fromId,
      toId: input.toId,
      amount: Math.round(input.amount * 100) / 100,
      createdBy: input.createdBy,
      isSettled: true,
      timestamp: serverTimestamp(),
    });
    return ref.id;
  },

  listenGroupSettlements(groupId: string, cb: (settlements: SettlementRecord[]) => void, onError?: (error: Error) => void): Unsubscribe {
    const db = ensureDb();
    const q = query(collection(db, "groups", groupId, "settlements"), orderBy("timestamp", "desc"));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => normalizeSettlement(d.id, d.data(), groupId))),
      (error) => onError?.(error),
    );
  },
};
