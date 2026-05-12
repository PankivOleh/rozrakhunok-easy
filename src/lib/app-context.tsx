import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { CURRENT_USER_ID, type Expense, type Group, type Member } from "@/lib/split";

type Ctx = {
  currentUserId: string;
  groups: Group[];
  expenses: Expense[];
  monthlyBudget: number;
  addExpense: (e: Omit<Expense, "id" | "date"> & { date?: string }) => void;
  addGroup: (g: Omit<Group, "id">) => void;
  getGroup: (id: string) => Group | undefined;
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

const initialGroups: Group[] = [
  { id: "g_shashlik", name: "Шашлик", emoji: "🍖", members: initialMembers.g_shashlik },
  { id: "g_trip", name: "Вікенд-подорож", emoji: "🏔️", members: initialMembers.g_trip },
  { id: "g_room", name: "Сусіди", emoji: "🏠", members: initialMembers.g_room },
];

const initialExpenses: Expense[] = [
  {
    id: "e1",
    groupId: "g_shashlik",
    description: "М'ясо",
    amount: 1200,
    payerId: "u_andriy",
    splitType: "equal",
    date: "2026-05-10",
  },
  {
    id: "e2",
    groupId: "g_shashlik",
    description: "Напої",
    amount: 450,
    payerId: CURRENT_USER_ID,
    splitType: "equal",
    date: "2026-05-10",
  },
  {
    id: "e3",
    groupId: "g_trip",
    description: "Бензин",
    amount: 800,
    payerId: CURRENT_USER_ID,
    splitType: "equal",
    date: "2026-05-08",
  },
  {
    id: "e4",
    groupId: "g_room",
    description: "Комуналка",
    amount: 1800,
    payerId: "u_ira",
    splitType: "equal",
    date: "2026-05-05",
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  const value = useMemo<Ctx>(
    () => ({
      currentUserId: CURRENT_USER_ID,
      groups,
      expenses,
      monthlyBudget: 2000,
      addExpense: (e) =>
        setExpenses((prev) => [
          { ...e, id: `e_${Date.now()}`, date: e.date ?? new Date().toISOString().slice(0, 10) },
          ...prev,
        ]),
      addGroup: (g) => setGroups((prev) => [...prev, { ...g, id: `g_${Date.now()}` }]),
      getGroup: (id) => groups.find((g) => g.id === id),
    }),
    [groups, expenses],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
