import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Expense, Group, ReminderFrequency, ScheduledReminder, SettlementRecord } from "@/lib/split";
import type { InAppNotification } from "@/types/database";
import { useAuth } from "@/lib/auth-context";
import { groupService } from "@/services/groupService";
import { expenseService } from "@/services/expenseService";
import { reminderService } from "@/services/reminderService";
import { notificationService } from "@/services/notificationService";

type Ctx = {
  currentUserId: string;
  groups: Group[];
  expenses: Expense[];
  settlements: SettlementRecord[];
  reminders: ScheduledReminder[];
  notifications: InAppNotification[];
  monthlyBudget: number;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  addExpense: (e: Omit<Expense, "id" | "date"> & { date?: string }) => Promise<void>;
  addGroup: (g: { name: string; emoji: string }) => Promise<string>;
  addMember: (groupId: string, member: { id?: string; name: string }) => Promise<void>;
  joinGroup: (groupId: string) => Promise<void>;
  setMonthlyBudget: (v: number) => Promise<void>;
  getGroup: (id: string) => Group | undefined;
  settleDebt: (groupId: string, fromId: string, toId: string, amount: number) => Promise<void>;
  sendDebtReminder: (groupId: string, debtorId: string, creditorId: string, amount: number, message: string) => Promise<void>;
  scheduleReminder: (r: Omit<ScheduledReminder, "id" | "createdAt" | "lastRemindedAt">) => Promise<void>;
  cancelReminder: (id: string, groupId?: string) => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const uid = user?.id ?? "";

  const [groups, setGroups] = useState<Group[]>([]);
  const [expensesByGroup, setExpensesByGroup] = useState<Record<string, Expense[]>>({});
  const [settlementsByGroup, setSettlementsByGroup] = useState<Record<string, SettlementRecord[]>>({});
  const [remindersByGroup, setRemindersByGroup] = useState<Record<string, ScheduledReminder[]>>({});
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGroups([]);
    setExpensesByGroup({});
    setSettlementsByGroup({});
    setRemindersByGroup({});
    setNotifications([]);
    setError(null);
    if (!uid) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const unsubscribeGroups = groupService.listenUserGroups(
      uid,
      async (dbGroups) => {
        try {
          const hydrated = await groupService.hydrateGroups(dbGroups);
          if (!active) return;
          setGroups(hydrated);
          const valid = new Set(hydrated.map((g) => g.id));
          setExpensesByGroup((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => valid.has(id))));
          setSettlementsByGroup((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => valid.has(id))));
          setRemindersByGroup((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => valid.has(id))));
          setLoading(false);
        } catch (err) {
          if (!active) return;
          setError((err as Error).message);
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    const unsubscribeNotifications = notificationService.listenUserNotifications(
      uid,
      setNotifications,
      (err) => setError(err.message),
    );

    return () => {
      active = false;
      unsubscribeGroups();
      unsubscribeNotifications();
    };
  }, [uid]);

  useEffect(() => {
    if (!groups.length) return;
    const unsubs = groups.flatMap((group) => [
      expenseService.listenGroupExpenses(
        group.id,
        (items) => setExpensesByGroup((prev) => ({ ...prev, [group.id]: items })),
        (err) => setError(err.message),
      ),
      expenseService.listenGroupSettlements(
        group.id,
        (items) => setSettlementsByGroup((prev) => ({ ...prev, [group.id]: items })),
        (err) => setError(err.message),
      ),
      reminderService.listenGroupReminders(
        group.id,
        (items) => setRemindersByGroup((prev) => ({ ...prev, [group.id]: items })),
        (err) => setError(err.message),
      ),
    ]);
    return () => { unsubs.forEach((unsubscribe) => unsubscribe()); };
  }, [groups]);

  const expenses = useMemo(
    () => Object.values(expensesByGroup).flat().sort((a, b) => b.date.localeCompare(a.date)),
    [expensesByGroup],
  );
  const settlements = useMemo(() => Object.values(settlementsByGroup).flat(), [settlementsByGroup]);
  const reminders = useMemo(() => Object.values(remindersByGroup).flat(), [remindersByGroup]);

  const addExpense = useCallback<Ctx["addExpense"]>(async (expense) => {
    if (!uid) throw new Error("Потрібно увійти");
    const group = groups.find((g) => g.id === expense.groupId);
    if (!group) throw new Error("Групу не знайдено");
    await expenseService.addExpense({
      ...expense,
      participants: expense.participants ?? group.members.map((m) => m.id),
      createdBy: uid,
    });
    await Promise.all(
      group.members
        .filter((member) => member.id !== uid)
        .map((member) => notificationService.create({
          toUserId: member.id,
          fromUserId: uid,
          groupId: group.id,
          type: "expense",
          message: `Нова витрата у "${group.name}": ${expense.description}`,
          amount: expense.amount,
        })),
    );
  }, [uid, groups]);

  const addGroup = useCallback<Ctx["addGroup"]>(async ({ name, emoji }) => {
    if (!uid) throw new Error("Потрібно увійти");
    return groupService.createGroup({ name, emoji, creatorId: uid });
  }, [uid]);

  const addMember = useCallback<Ctx["addMember"]>(async (groupId, member) => {
    if (!member.id) throw new Error("Додавати можна лише зареєстрованих користувачів за username");
    await groupService.addMember(groupId, member.id);
  }, []);

  const joinGroup = useCallback<Ctx["joinGroup"]>(async (groupId) => {
    if (!uid) throw new Error("Потрібно увійти");
    await groupService.joinGroup(groupId, uid);
  }, [uid]);

  const setMonthlyBudget = useCallback<Ctx["setMonthlyBudget"]>(async (value) => {
    await updateUser({ monthlyBudget: value });
  }, [updateUser]);

  const settleDebt = useCallback<Ctx["settleDebt"]>(async (groupId, fromId, toId, amount) => {
    if (!uid) throw new Error("Потрібно увійти");
    await expenseService.settleDebt({ groupId, fromId, toId, amount, createdBy: uid });
  }, [uid]);

  const sendDebtReminder = useCallback<Ctx["sendDebtReminder"]>(async (groupId, debtorId, creditorId, amount, message) => {
    await notificationService.sendDebtReminder({ groupId, debtorId, creditorId, message, amount });
  }, []);

  const scheduleReminder = useCallback<Ctx["scheduleReminder"]>(async (reminder) => {
    await reminderService.upsertReminder(reminder);
  }, []);

  const cancelReminder = useCallback<Ctx["cancelReminder"]>(async (id, groupId) => {
    const resolvedGroupId = groupId ?? reminders.find((r) => r.id === id)?.groupId;
    if (!resolvedGroupId) return;
    await reminderService.cancelReminder(resolvedGroupId, id);
  }, [reminders]);

  const markNotificationsRead = useCallback(async () => {
    await notificationService.markAllRead(notifications);
  }, [notifications]);

  const clearNotifications = useCallback(async () => {
    if (!uid) return;
    await notificationService.clearUserNotifications(uid, notifications);
  }, [uid, notifications]);

  const value = useMemo<Ctx>(
    () => ({
      currentUserId: uid,
      groups,
      expenses,
      settlements,
      reminders,
      notifications,
      monthlyBudget: user?.monthlyBudget ?? 2000,
      loading,
      error,
      isLive: true,
      addExpense,
      addGroup,
      addMember,
      joinGroup,
      setMonthlyBudget,
      getGroup: (id) => groups.find((group) => group.id === id),
      settleDebt,
      sendDebtReminder,
      scheduleReminder,
      cancelReminder,
      markNotificationsRead,
      clearNotifications,
    }),
    [uid, groups, expenses, settlements, reminders, notifications, user?.monthlyBudget, loading, error, addExpense, addGroup, addMember, joinGroup, setMonthlyBudget, settleDebt, sendDebtReminder, scheduleReminder, cancelReminder, markNotificationsRead, clearNotifications],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

export type { ReminderFrequency };
