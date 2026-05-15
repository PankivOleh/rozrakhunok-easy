import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import type { Expense, Group, MemberBalance, Transaction } from "@/types/database";

function ensureDb() {
  const { db } = getFirebase();
  if (!db) throw new Error("Firebase не налаштовано");
  return db;
}

export const settlementService = {
  calcBalances(group: Pick<Group, "id" | "members">, expenses: Expense[], settled: Transaction[] = []): MemberBalance[] {
    const balances: Record<string, number> = {};
    group.members.forEach((memberId) => (balances[memberId] = 0));

    for (const expense of expenses) {
      balances[expense.payerId] = (balances[expense.payerId] ?? 0) + expense.amount;
      const participants = expense.participants?.length ? expense.participants : group.members;
      if (expense.splitType === "equal") {
        const share = expense.amount / participants.length;
        participants.forEach((memberId) => (balances[memberId] = (balances[memberId] ?? 0) - share));
      } else if (expense.shares) {
        Object.entries(expense.shares).forEach(([memberId, amount]) => {
          balances[memberId] = (balances[memberId] ?? 0) - amount;
        });
      }
    }

    for (const settlement of settled) {
      balances[settlement.fromId] = (balances[settlement.fromId] ?? 0) + settlement.amount;
      balances[settlement.toId] = (balances[settlement.toId] ?? 0) - settlement.amount;
    }

    return Object.entries(balances).map(([userId, balance]) => ({ userId, balance }));
  },

  optimize(groupId: string, balances: MemberBalance[]): Transaction[] {
    const round = (n: number) => Math.round(n * 100) / 100;
    const debtors = balances.filter((b) => b.balance < -0.01).map((b) => ({ id: b.userId, value: round(b.balance) })).sort((a, b) => a.value - b.value);
    const creditors = balances.filter((b) => b.balance > 0.01).map((b) => ({ id: b.userId, value: round(b.balance) })).sort((a, b) => b.value - a.value);
    const now = new Date().toISOString();
    const transactions: Transaction[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amount = Math.min(-debtor.value, creditor.value);
      transactions.push({
        id: `${debtor.id}_${creditor.id}_${transactions.length}`,
        groupId,
        fromId: debtor.id,
        toId: creditor.id,
        amount: round(amount),
        isSettled: false,
        timestamp: now,
        createdBy: "system",
      });
      debtor.value += amount;
      creditor.value -= amount;
      if (Math.abs(debtor.value) < 0.01) debtorIndex++;
      if (Math.abs(creditor.value) < 0.01) creditorIndex++;
    }

    return transactions;
  },

  async recalculateForGroup(groupId: string): Promise<Transaction[]> {
    const db = ensureDb();
    const groupSnap = await getDoc(doc(db, "groups", groupId));
    if (!groupSnap.exists()) return [];
    const group = { id: groupSnap.id, ...groupSnap.data() } as Group;
    const [expenseSnap, settlementSnap] = await Promise.all([
      getDocs(collection(db, "groups", groupId, "expenses")),
      getDocs(collection(db, "groups", groupId, "settlements")),
    ]);
    const expenses = expenseSnap.docs.map((d) => ({ id: d.id, groupId, ...d.data() }) as Expense);
    const settlements = settlementSnap.docs.map((d) => ({ id: d.id, groupId, ...d.data() }) as Transaction);
    return this.optimize(groupId, this.calcBalances(group, expenses, settlements));
  },
};
