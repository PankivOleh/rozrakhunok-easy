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

export function formatUAH(value: number): string {
  return `${value.toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₴`;
}

export function calcMemberBalances(
  group: Group,
  expenses: Expense[],
  settlements: SettlementRecord[] = [],
): Record<string, number> {
  const balances: Record<string, number> = {};
  group.members.forEach((m) => (balances[m.id] = 0));

  for (const e of expenses.filter((expense) => expense.groupId === group.id)) {
    balances[e.payerId] = (balances[e.payerId] ?? 0) + e.amount;
    const participants = e.participants?.length ? e.participants : group.members.map((m) => m.id);
    if (e.splitType === "equal") {
      const share = e.amount / participants.length;
      participants.forEach((memberId) => { balances[memberId] = (balances[memberId] ?? 0) - share; });
    } else if (e.shares) {
      for (const [memberId, amount] of Object.entries(e.shares)) {
        balances[memberId] = (balances[memberId] ?? 0) - amount;
      }
    }
  }

  for (const s of settlements.filter((settlement) => settlement.groupId === group.id)) {
    balances[s.fromId] = (balances[s.fromId] ?? 0) + s.amount;
    balances[s.toId] = (balances[s.toId] ?? 0) - s.amount;
  }
  return balances;
}

export function optimizeSettlements(balances: Record<string, number>): Settlement[] {
  const entries = Object.entries(balances).map(([id, value]) => ({ id, value: Math.round(value * 100) / 100 }));
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
    const amount = Math.min(-debtor.value, creditor.value);
    settlements.push({
      fromId: debtor.id,
      toId: creditor.id,
      amount: Math.round(amount * 100) / 100,
    });
    debtor.value += amount;
    creditor.value -= amount;
    if (Math.abs(debtor.value) < 0.01) debtorIndex++;
    if (Math.abs(creditor.value) < 0.01) creditorIndex++;
  }
  return settlements;
}
