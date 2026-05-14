import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CURRENT_USER_ID,
  type Expense,
  type Group,
  type Member,
  type ReminderFrequency,
  type ScheduledReminder,
  type SettlementRecord,
} from "@/lib/split";
import { useAuth } from "@/lib/auth-context";

type Ctx = {
  currentUserId: string;
  groups: Group[];
  expenses: Expense[];
  settlements: SettlementRecord[];
  reminders: ScheduledReminder[];
  monthlyBudget: number;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  addExpense: (e: Omit<Expense, "id" | "date"> & { date?: string }) => void;
  addGroup: (g: { name: string; emoji: string; memberNames?: string[] }) => string;
  addMember: (groupId: string, member: { id?: string; name: string }) => void;
  joinGroup: (groupId: string) => void;
  setMonthlyBudget: (v: number) => void;
  getGroup: (id: string) => Group | undefined;
  settleDebt: (groupId: string, fromId: string, toId: string, amount: number) => void;
  scheduleReminder: (r: Omit<ScheduledReminder, "id" | "createdAt" | "lastRemindedAt">) => void;
  cancelReminder: (id: string) => void;
};

const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "ps_app_state_v2";

type Persisted = {
  groups: Group[];
  expenses: Expense[];
  settlements: SettlementRecord[];
  reminders: ScheduledReminder[];
  monthlyBudget: number;
};

function defaultState(currentUserId: string, displayName: string): Persisted {
  const me: Member = { id: currentUserId, name: displayName };
  return {
    monthlyBudget: 2000,
    settlements: [],
    reminders: [],
    groups: [
      {
        id: "g_shashlik",
        name: "Шашлик",
        emoji: "🍖",
        members: [me, { id: "u_andriy", name: "Андрій" }, { id: "u_bogdan", name: "Богдан" }],
      },
      {
        id: "g_trip",
        name: "Вікенд-подорож",
        emoji: "🏔️",
        members: [me, { id: "u_andriy", name: "Андрій" }, { id: "u_maria", name: "Марія" }],
      },
    ],
    expenses: [
      { id: "e1", groupId: "g_shashlik", description: "М'ясо", amount: 1200, payerId: "u_andriy", splitType: "equal", date: "2026-05-10" },
      { id: "e2", groupId: "g_shashlik", description: "Напої", amount: 450, payerId: currentUserId, splitType: "equal", date: "2026-05-10" },
      { id: "e3", groupId: "g_trip", description: "Бензин", amount: 800, payerId: currentUserId, splitType: "equal", date: "2026-05-08" },
    ],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? CURRENT_USER_ID;
  const displayName = user?.displayName ?? "Я";

  const storageKey = `${STORAGE_KEY}_${uid}`;

  const [state, setState] = useState<Persisted>(() => defaultState(uid, displayName));

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        setState({
          ...defaultState(uid, displayName),
          ...parsed,
          settlements: parsed.settlements ?? [],
          reminders: parsed.reminders ?? [],
        });
        return;
      }
    } catch { /* noop */ }
    setState(defaultState(uid, displayName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Cross-tab live sync ("onSnapshot" equivalent)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try { setState(JSON.parse(e.newValue)); } catch { /* noop */ }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [storageKey]);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const addExpense = useCallback<Ctx["addExpense"]>((e) => {
    setState((s) => ({
      ...s,
      expenses: [
        { ...e, id: `e_${Date.now()}`, date: e.date ?? new Date().toISOString().slice(0, 10) },
        ...s.expenses,
      ],
    }));
  }, []);

  const addGroup = useCallback<Ctx["addGroup"]>(
    ({ name, emoji, memberNames = [] }) => {
      const id = `g_${Date.now()}`;
      const me: Member = { id: uid, name: displayName };
      const members: Member[] = [
        me,
        ...memberNames.filter((n) => n.trim()).map((n, i) => ({ id: `u_${id}_${i}`, name: n.trim() })),
      ];
      setState((s) => ({ ...s, groups: [...s.groups, { id, name, emoji, members }] }));
      return id;
    },
    [uid, displayName],
  );

  const addMember = useCallback<Ctx["addMember"]>((groupId, member) => {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: g.members.some((m) => m.id === member.id)
                ? g.members
                : [...g.members, { id: member.id ?? `u_${groupId}_${Date.now()}`, name: member.name.trim() }],
            }
          : g,
      ),
    }));
  }, []);

  const joinGroup = useCallback<Ctx["joinGroup"]>((groupId) => {
    setState((s) => {
      const g = s.groups.find((x) => x.id === groupId);
      if (!g) return s;
      if (g.members.some((m) => m.id === uid)) return s;
      return {
        ...s,
        groups: s.groups.map((x) =>
          x.id === groupId ? { ...x, members: [...x.members, { id: uid, name: displayName }] } : x,
        ),
      };
    });
  }, [uid, displayName]);

  const setMonthlyBudget = useCallback<Ctx["setMonthlyBudget"]>((v) => {
    setState((s) => ({ ...s, monthlyBudget: v }));
  }, []);

  const settleDebt = useCallback<Ctx["settleDebt"]>((groupId, fromId, toId, amount) => {
    setState((s) => ({
      ...s,
      settlements: [
        ...s.settlements,
        {
          id: `s_${Date.now()}`,
          groupId,
          fromId,
          toId,
          amount: Math.round(amount * 100) / 100,
          date: new Date().toISOString().slice(0, 10),
        },
      ],
    }));
  }, []);

  const scheduleReminder = useCallback<Ctx["scheduleReminder"]>((r) => {
    setState((s) => ({
      ...s,
      reminders: [
        ...s.reminders.filter((x) => !(x.groupId === r.groupId && x.creditorId === r.creditorId && x.debtorId === r.debtorId)),
        {
          ...r,
          id: `r_${Date.now()}`,
          createdAt: new Date().toISOString(),
          lastRemindedAt: null,
        },
      ],
    }));
  }, []);

  const cancelReminder = useCallback<Ctx["cancelReminder"]>((id) => {
    setState((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      currentUserId: uid,
      groups: state.groups,
      expenses: state.expenses,
      settlements: state.settlements,
      reminders: state.reminders,
      monthlyBudget: state.monthlyBudget,
      loading: false,
      error: null,
      isLive: false,
      addExpense,
      addGroup,
      addMember,
      joinGroup,
      setMonthlyBudget,
      getGroup: (id) => state.groups.find((g) => g.id === id),
      settleDebt,
      scheduleReminder,
      cancelReminder,
    }),
    [uid, state, addExpense, addGroup, addMember, joinGroup, setMonthlyBudget, settleDebt, scheduleReminder, cancelReminder],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

export type { ReminderFrequency };
