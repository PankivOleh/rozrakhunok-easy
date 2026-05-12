import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CURRENT_USER_ID, type Expense as LocalExpense, type Group as LocalGroup, type Member } from "@/lib/split";
import { isFirebaseConfigured } from "@/lib/firebase";
import { authService } from "@/services/authService";
import { groupService } from "@/services/groupService";
import { expenseService } from "@/services/expenseService";
import type { Expense as DbExpense, Group as DbGroup } from "@/types/database";

type Ctx = {
  currentUserId: string;
  groups: LocalGroup[];
  expenses: LocalExpense[];
  monthlyBudget: number;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  addExpense: (e: Omit<LocalExpense, "id" | "date"> & { date?: string }) => Promise<void> | void;
  addGroup: (g: Omit<LocalGroup, "id">) => Promise<void> | void;
  getGroup: (id: string) => LocalGroup | undefined;
};

const AppCtx = createContext<Ctx | null>(null);

const initialMembers: Record<string, Member[]> = {
  g_trip: [
    { id: CURRENT_USER_ID, name: "Олег" },
    { id: "u_andriy", name: "Андрій" },
    { id: "u_bogdan", name: "Богдан" },
    { id: "u_maria", name: "Марія" },
  ],
  g_room: [
    { id: CURRENT_USER_ID, name: "Олег" },
    { id: "u_ira", name: "Іра" },
    { id: "u_sasha", name: "Саша" },
  ],
  g_shashlik: [
    { id: CURRENT_USER_ID, name: "Олег" },
    { id: "u_andriy", name: "Андрій" },
    { id: "u_bogdan", name: "Богдан" },
  ],
};

const initialGroups: LocalGroup[] = [
  { id: "g_shashlik", name: "Шашлик", emoji: "🍖", members: initialMembers.g_shashlik },
  { id: "g_trip", name: "Вікенд-подорож", emoji: "🏔️", members: initialMembers.g_trip },
  { id: "g_room", name: "Сусіди", emoji: "🏠", members: initialMembers.g_room },
];

const initialExpenses: LocalExpense[] = [
  { id: "e1", groupId: "g_shashlik", description: "М'ясо", amount: 1200, payerId: "u_andriy", splitType: "equal", date: "2026-05-10" },
  { id: "e2", groupId: "g_shashlik", description: "Напої", amount: 450, payerId: CURRENT_USER_ID, splitType: "equal", date: "2026-05-10" },
  { id: "e3", groupId: "g_trip", description: "Бензин", amount: 800, payerId: CURRENT_USER_ID, splitType: "equal", date: "2026-05-08" },
  { id: "e4", groupId: "g_room", description: "Комуналка", amount: 1800, payerId: "u_ira", splitType: "equal", date: "2026-05-05" },
];

function dbExpenseToLocal(e: DbExpense): LocalExpense {
  return {
    id: e.id,
    groupId: e.groupId,
    description: e.description,
    amount: e.amount,
    payerId: e.payerId,
    splitType: e.splitType === "equal" ? "equal" : "unequal",
    shares: e.shares,
    recurring: e.recurring,
    date: e.timestamp?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  };
}

function dbGroupToLocal(g: DbGroup): LocalGroup {
  return {
    id: g.id,
    name: g.name,
    emoji: g.emoji ?? "👥",
    members: g.members.map((uid) => ({ id: uid, name: uid })),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<LocalGroup[]>(initialGroups);
  const [expenses, setExpenses] = useState<LocalExpense[]>(initialExpenses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string>(CURRENT_USER_ID);

  const isLive = isFirebaseConfigured;

  // Live mode: subscribe to auth + groups + per-group expenses
  useEffect(() => {
    if (!isLive) return;
    setLoading(true);
    const unsubAuth = authService.onAuthChange((user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUid(user.uid);
      const unsubGroups = groupService.listenUserGroups(user.uid, (gs) => {
        setGroups(gs.map(dbGroupToLocal));
        setLoading(false);
      });
      return unsubGroups;
    });
    return () => {
      if (typeof unsubAuth === "function") unsubAuth();
    };
  }, [isLive]);

  useEffect(() => {
    if (!isLive || !groups.length) return;
    const unsubs = groups.map((g) =>
      expenseService.listenGroupExpenses(g.id, (list) => {
        setExpenses((prev) => {
          const others = prev.filter((e) => e.groupId !== g.id);
          return [...others, ...list.map(dbExpenseToLocal)];
        });
      }),
    );
    return () => unsubs.forEach((u) => u && u());
  }, [isLive, groups]);

  const addExpense = useCallback<Ctx["addExpense"]>(
    async (e) => {
      if (isLive) {
        try {
          setError(null);
          await expenseService.addExpense({
            groupId: e.groupId,
            payerId: e.payerId,
            amount: e.amount,
            description: e.description,
            splitType: e.splitType === "equal" ? "equal" : "unequal",
            participants: groups.find((g) => g.id === e.groupId)?.members.map((m) => m.id) ?? [],
            shares: e.shares,
            recurring: e.recurring,
          });
        } catch (err) {
          setError((err as Error).message);
        }
        return;
      }
      setExpenses((prev) => [
        { ...e, id: `e_${Date.now()}`, date: e.date ?? new Date().toISOString().slice(0, 10) },
        ...prev,
      ]);
    },
    [isLive, groups],
  );

  const addGroup = useCallback<Ctx["addGroup"]>(
    async (g) => {
      if (isLive) {
        try {
          setError(null);
          await groupService.createGroup({ name: g.name, emoji: g.emoji, creatorId: uid });
        } catch (err) {
          setError((err as Error).message);
        }
        return;
      }
      setGroups((prev) => [...prev, { ...g, id: `g_${Date.now()}` }]);
    },
    [isLive, uid],
  );

  const value = useMemo<Ctx>(
    () => ({
      currentUserId: uid,
      groups,
      expenses,
      monthlyBudget: 2000,
      loading,
      error,
      isLive,
      addExpense,
      addGroup,
      getGroup: (id) => groups.find((g) => g.id === id),
    }),
    [uid, groups, expenses, loading, error, isLive, addExpense, addGroup],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
