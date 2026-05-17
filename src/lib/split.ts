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
  participants?: string[];
  shares?: Record<string, number>;
  recurring?: boolean;
  date: string;
};

export type SettlementRecord = {
  id: string;
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
};

export type ReminderFrequency = "daily" | "weekly" | "monthly";

export type ScheduledReminder = {
  id: string;
  groupId: string;
  creditorId: string;
  debtorId: string;
  amount?: number;
  intervalDays: number;
  frequency?: ReminderFrequency;
  lastRemindedAt: string | null;
  createdAt: string;
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

/** Strict 2-decimal rounding that avoids floating-point drift. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatUAH(value: number): string {
  return `${round2(value).toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₴`;
}

export function calcMemberBalances(
  group: Group,
  expenses: Expense[],
  settlements: SettlementRecord[] = [],
): Record<string, number> {
  const balances: Record<string, number> = {};
  group.members.forEach((m) => (balances[m.id] = 0));

  for (const e of expenses.filter((expense) => expense.groupId === group.id)) {
    balances[e.payerId] = round2((balances[e.payerId] ?? 0) + e.amount);
    const participants = e.participants?.length ? e.participants : group.members.map((m) => m.id);
    if (e.splitType === "equal") {
      // Distribute amount evenly with cent-perfect remainder handling.
      const totalCents = Math.round(e.amount * 100);
      const baseCents = Math.floor(totalCents / participants.length);
      let remainder = totalCents - baseCents * participants.length;
      participants.forEach((memberId) => {
        const shareCents = baseCents + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        balances[memberId] = round2((balances[memberId] ?? 0) - shareCents / 100);
      });
    } else if (e.shares) {
      for (const [memberId, amount] of Object.entries(e.shares)) {
        balances[memberId] = round2((balances[memberId] ?? 0) - amount);
      }
    }
  }

  for (const s of settlements.filter((settlement) => settlement.groupId === group.id)) {
    balances[s.fromId] = round2((balances[s.fromId] ?? 0) + s.amount);
    balances[s.toId] = round2((balances[s.toId] ?? 0) - s.amount);
  }
  return balances;
}

export function optimizeSettlements(balances: Record<string, number>): Settlement[] {
  const entries = Object.entries(balances).map(([id, value]) => ({ id, value: round2(value) }));
  const debtors = entries.filter((entry) => entry.value < -0.01).map((entry) => ({ ...entry }));
  const creditors = entries.filter((entry) => entry.value > 0.01).map((entry) => ({ ...entry }));
  debtors.sort((a, b) => a.value - b.value);
  creditors.sort((a, b) => b.value - a.value);

  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = round2(Math.min(-debtor.value, creditor.value));
    settlements.push({ fromId: debtor.id, toId: creditor.id, amount });
    debtor.value = round2(debtor.value + amount);
    creditor.value = round2(creditor.value - amount);
    if (Math.abs(debtor.value) < 0.01) debtorIndex++;
    if (Math.abs(creditor.value) < 0.01) creditorIndex++;
  }
  return settlements;
}
