import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CURRENT_USER_ID, type Expense, type Group, type Member } from "@/lib/split";
import { useAuth } from "@/lib/auth-context";

type Ctx = {
  currentUserId: string;
  groups: Group[];
  expenses: Expense[];
  monthlyBudget: number;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  addExpense: (e: Omit<Expense, "id" | "date"> & { date?: string }) => void;
  addGroup: (g: { name: string; emoji: string; memberNames?: string[] }) => string;
  addMember: (groupId: string, name: string) => void;
  setMonthlyBudget: (v: number) => void;
  getGroup: (id: string) => Group | undefined;
};

const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "ps_app_state_v1";

type Persisted = { groups: Group[]; expenses: Expense[]; monthlyBudget: number };

function defaultState(currentUserId: string, displayName: string): Persisted {
  const me: Member = { id: currentUserId, name: displayName };
  return {
    monthlyBudget: 2000,
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

  // Load on auth change
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setState(JSON.parse(raw));
        return;
      }
    } catch {
      // ignore
    }
    setState(defaultState(uid, displayName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist
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

  const addMember = useCallback<Ctx["addMember"]>((groupId, name) => {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) =>
        g.id === groupId
          ? { ...g, members: [...g.members, { id: `u_${groupId}_${Date.now()}`, name: name.trim() }] }
          : g,
      ),
    }));
  }, []);

  const setMonthlyBudget = useCallback<Ctx["setMonthlyBudget"]>((v) => {
    setState((s) => ({ ...s, monthlyBudget: v }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      currentUserId: uid,
      groups: state.groups,
      expenses: state.expenses,
      monthlyBudget: state.monthlyBudget,
      loading: false,
      error: null,
      isLive: false,
      addExpense,
      addGroup,
      addMember,
      setMonthlyBudget,
      getGroup: (id) => state.groups.find((g) => g.id === id),
    }),
    [uid, state, addExpense, addGroup, addMember, setMonthlyBudget],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
