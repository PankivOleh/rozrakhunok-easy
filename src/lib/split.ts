export type Member = {
  id: string;
  name: string;
  avatar?: string;
};

export type SplitType = "equal" | "unequal";

export type Expense = {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  payerId: string;
  splitType: SplitType;
  shares?: Record<string, number>; // memberId -> amount (for unequal)
  recurring?: boolean;
  date: string;
};

export type Group = {
  id: string;
  name: string;
  emoji: string;
  members: Member[];
};

export type Settlement = {
  fromId: string;
  toId: string;
  amount: number;
};

export const CURRENT_USER_ID = "u_oleg";

export function formatUAH(value: number): string {
  return `${value.toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₴`;
}

export function calcMemberBalances(group: Group, expenses: Expense[]): Record<string, number> {
  const balances: Record<string, number> = {};
  group.members.forEach((m) => (balances[m.id] = 0));
  const groupExpenses = expenses.filter((e) => e.groupId === group.id);

  for (const e of groupExpenses) {
    balances[e.payerId] = (balances[e.payerId] ?? 0) + e.amount;
    if (e.splitType === "equal") {
      const share = e.amount / group.members.length;
      group.members.forEach((m) => {
        balances[m.id] -= share;
      });
    } else if (e.shares) {
      for (const [mid, amt] of Object.entries(e.shares)) {
        balances[mid] = (balances[mid] ?? 0) - amt;
      }
    }
  }
  return balances;
}

// Greedy minimization
export function optimizeSettlements(balances: Record<string, number>): Settlement[] {
  const entries = Object.entries(balances).map(([id, v]) => ({ id, v: Math.round(v * 100) / 100 }));
  const debtors = entries.filter((e) => e.v < -0.01).map((e) => ({ ...e }));
  const creditors = entries.filter((e) => e.v > 0.01).map((e) => ({ ...e }));
  debtors.sort((a, b) => a.v - b.v);
  creditors.sort((a, b) => b.v - a.v);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.v, creditor.v);
    settlements.push({
      fromId: debtor.id,
      toId: creditor.id,
      amount: Math.round(amount * 100) / 100,
    });
    debtor.v += amount;
    creditor.v -= amount;
    if (Math.abs(debtor.v) < 0.01) i++;
    if (Math.abs(creditor.v) < 0.01) j++;
  }
  return settlements;
}
