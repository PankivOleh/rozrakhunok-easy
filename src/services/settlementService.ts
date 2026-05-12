import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { Expense, Group, MemberBalance, Transaction } from "@/types/database";

/**
 * Smart Settlement service.
 * Computes net balances per member and minimizes the number of
 * transactions needed to settle all debts (greedy algorithm).
 */
export const settlementService = {
  calcBalances(group: Pick<Group, "members">, expenses: Expense[]): MemberBalance[] {
    const balances: Record<string, number> = {};
    group.members.forEach((m) => (balances[m] = 0));

    for (const e of expenses) {
      balances[e.payerId] = (balances[e.payerId] ?? 0) + e.amount;
      const participants = e.participants?.length ? e.participants : group.members;
      if (e.splitType === "equal") {
        const share = e.amount / participants.length;
        participants.forEach((p) => (balances[p] = (balances[p] ?? 0) - share));
      } else if (e.shares) {
        for (const [uid, amt] of Object.entries(e.shares)) {
          balances[uid] = (balances[uid] ?? 0) - amt;
        }
      }
    }
    return Object.entries(balances).map(([userId, balance]) => ({ userId, balance }));
  },

  optimize(balances: MemberBalance[]): Transaction[] {
    const round = (n: number) => Math.round(n * 100) / 100;
    const debtors = balances
      .filter((b) => b.balance < -0.01)
      .map((b) => ({ id: b.userId, v: round(b.balance) }))
      .sort((a, b) => a.v - b.v);
    const creditors = balances
      .filter((b) => b.balance > 0.01)
      .map((b) => ({ id: b.userId, v: round(b.balance) }))
      .sort((a, b) => b.v - a.v);

    const txs: Transaction[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(-debtors[i].v, creditors[j].v);
      txs.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: round(amount),
        isSettled: false,
        timestamp: new Date().toISOString(),
      });
      debtors[i].v += amount;
      creditors[j].v -= amount;
      if (Math.abs(debtors[i].v) < 0.01) i++;
      if (Math.abs(creditors[j].v) < 0.01) j++;
    }
    return txs;
  },

  /** Convenience: pull live data from Firestore and produce optimized transactions. */
  async recalculateForGroup(groupId: string): Promise<Transaction[]> {
    const { db } = getFirebase();
    if (!db) return [];
    const groupSnap = await getDocs(
      query(collection(db, "groups"), where("__name__", "==", groupId)),
    );
    const group = groupSnap.docs[0]?.data() as Group | undefined;
    if (!group) return [];
    const expSnap = await getDocs(query(collection(db, "expenses"), where("groupId", "==", groupId)));
    const expenses = expSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
    const balances = this.calcBalances(group, expenses);
    return this.optimize(balances);
  },
};
