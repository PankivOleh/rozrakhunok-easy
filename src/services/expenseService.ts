import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { Expense } from "@/types/database";
import { settlementService } from "./settlementService";
import { notificationService } from "./notificationService";

function ensureDb() {
  const { db } = getFirebase();
  if (!db) throw new Error("Firebase не налаштовано");
  return db;
}

export const expenseService = {
  async addExpense(expense: Omit<Expense, "id" | "timestamp">): Promise<string> {
    const db = ensureDb();
    const ref = await addDoc(collection(db, "expenses"), {
      ...expense,
      timestamp: serverTimestamp(),
    });

    // Trigger settlement recalculation + notify members of new debts
    try {
      const settlements = await settlementService.recalculateForGroup(expense.groupId);
      await notificationService.notifyNewExpense(expense.groupId, expense, settlements);
    } catch (err) {
      console.error("Post-expense pipeline failed:", err);
    }

    return ref.id;
  },

  listenGroupExpenses(groupId: string, cb: (expenses: Expense[]) => void) {
    const db = ensureDb();
    const q = query(
      collection(db, "expenses"),
      where("groupId", "==", groupId),
      orderBy("timestamp", "desc"),
    );
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense));
    });
  },
};
