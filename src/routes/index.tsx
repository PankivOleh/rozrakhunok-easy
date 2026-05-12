import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Globe, Moon, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useApp } from "@/lib/app-context";
import { calcMemberBalances, formatUAH } from "@/lib/split";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Оплата та Поділ — Головна" },
      { name: "description", content: "Розділяй витрати з друзями та мінімізуй борги." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { groups, expenses, currentUserId, monthlyBudget } = useApp();

  const { totalOwedToMe, totalIOwe, net } = useMemo(() => {
    let owedToMe = 0;
    let iOwe = 0;
    for (const g of groups) {
      const bal = calcMemberBalances(g, expenses);
      const v = bal[currentUserId] ?? 0;
      if (v > 0) owedToMe += v;
      else iOwe += -v;
    }
    return { totalOwedToMe: owedToMe, totalIOwe: iOwe, net: owedToMe - iOwe };
  }, [groups, expenses, currentUserId]);

  const monthSpent = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return expenses
      .filter((e) => e.date.startsWith(m) && e.payerId === currentUserId)
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, currentUserId]);

  const budgetPct = Math.min(100, Math.round((monthSpent / monthlyBudget) * 100));

  const recent = expenses.slice(0, 6);

  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Привіт, Олег 👋</p>
          <h1 className="text-xl font-bold tracking-tight">Оплата та Поділ</h1>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn><Globe className="size-4" /></IconBtn>
          <IconBtn><Moon className="size-4" /></IconBtn>
          <IconBtn><Bell className="size-4" /></IconBtn>
          <div className="ml-1 size-9 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">О</div>
        </div>
      </header>

      <section className="px-5">
        <div className="rounded-3xl gradient-card p-5 shadow-glow text-primary-foreground relative overflow-hidden">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
          <p className="text-xs uppercase tracking-wider opacity-80">Чистий баланс</p>
          <p className="text-4xl font-bold mt-2">{formatUAH(net)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2">
              <div className="flex items-center gap-1 opacity-80 text-xs"><TrendingUp className="size-3" /> Вам винні</div>
              <div className="font-semibold mt-0.5">{formatUAH(totalOwedToMe)}</div>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2">
              <div className="flex items-center gap-1 opacity-80 text-xs"><TrendingDown className="size-3" /> Ви винні</div>
              <div className="font-semibold mt-0.5">{formatUAH(totalIOwe)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-card p-4 shadow-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Місячний бюджет</p>
            <p className="text-xs text-muted-foreground">{budgetPct}%</p>
          </div>
          <Progress value={budgetPct} className="h-2" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{formatUAH(monthSpent)}</span>
            <span>{formatUAH(monthlyBudget)}</span>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="px-5 flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Активні групи</h2>
          <Link to="/groups" className="text-xs text-primary">Усі</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar">
          {groups.map((g) => (
            <Link
              key={g.id}
              to="/groups/$groupId"
              params={{ groupId: g.id }}
              className="shrink-0 w-40 rounded-2xl bg-card border border-border p-4 shadow-card hover:border-primary/50 transition"
            >
              <div className="size-10 rounded-xl bg-accent flex items-center justify-center text-xl">{g.emoji}</div>
              <p className="mt-3 font-semibold text-sm">{g.name}</p>
              <p className="text-xs text-muted-foreground">{g.members.length} учасників</p>
            </Link>
          ))}
          <button className="shrink-0 w-40 rounded-2xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition">
            <Plus className="size-5" />
            <span className="text-xs">Нова група</span>
          </button>
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-base font-semibold mb-3">Остання активність</h2>
        <div className="space-y-2">
          {recent.map((e) => {
            const g = groups.find((x) => x.id === e.groupId);
            const payer = g?.members.find((m) => m.id === e.payerId);
            return (
              <div key={e.id} className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-accent flex items-center justify-center text-lg">{g?.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.description}</p>
                  <p className="text-xs text-muted-foreground truncate">{g?.name} · {payer?.name}</p>
                </div>
                <p className="text-sm font-semibold">{formatUAH(e.amount)}</p>
              </div>
            );
          })}
        </div>
      </section>
    </MobileShell>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="size-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition">
      {children}
    </button>
  );
}
