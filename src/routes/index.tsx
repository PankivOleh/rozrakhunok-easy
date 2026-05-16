import { createFileRoute, Link } from "@tanstack/react-router";
import { MailWarning, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { HeaderActions } from "@/components/HeaderActions";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { AddGroupDialog } from "@/components/AddGroupDialog";
import { FavoriteToggle } from "@/components/FavoriteToggle";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { calcMemberBalances, formatUAH } from "@/lib/split";
import { Progress } from "@/components/ui/progress";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
  const { groups, expenses, settlements, currentUserId, monthlyBudget } = useApp();
  const { user, resendVerification } = useAuth();
  const { t } = useI18n();
  const [resending, setResending] = useState(false);

  const { totalOwedToMe, totalIOwe, net } = useMemo(() => {
    let owedToMe = 0;
    let iOwe = 0;
    for (const g of groups) {
      const bal = calcMemberBalances(g, expenses, settlements);
      const v = bal[currentUserId] ?? 0;
      if (v > 0) owedToMe += v;
      else iOwe += -v;
    }
    return { totalOwedToMe: owedToMe, totalIOwe: iOwe, net: owedToMe - iOwe };
  }, [groups, expenses, settlements, currentUserId]);

  const monthSpent = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const resetIso = user?.budgetResetAt;
    return expenses
      .filter((e) => e.date.startsWith(monthKey) && e.payerId === currentUserId)
      .filter((e) => !resetIso || e.date >= resetIso.slice(0, 10))
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, currentUserId, user?.budgetResetAt]);

  const budgetPct = monthlyBudget ? Math.min(100, Math.round((monthSpent / monthlyBudget) * 100)) : 0;
  const recent = expenses.slice(0, 6);

  const showVerifyBanner = Boolean(user && user.email && user.emailVerified === false);
  const resend = async () => {
    setResending(true);
    try {
      await resendVerification();
      toast.success("Лист підтвердження надіслано");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{t("app.greeting")}, {user?.displayName ?? "—"} 👋</p>
          <h1 className="text-xl font-bold tracking-tight truncate">{t("app.title")}</h1>
        </div>
        <HeaderActions />
      </header>

      <section className="px-5">
        <div className="rounded-3xl gradient-card p-5 shadow-glow text-primary-foreground relative overflow-hidden">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
          <p className="text-xs uppercase tracking-wider opacity-80">{t("balance.net")}</p>
          <p className="text-4xl font-bold mt-2">{formatUAH(net)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2">
              <div className="flex items-center gap-1 opacity-80 text-xs"><TrendingUp className="size-3" /> {t("balance.owedToMe")}</div>
              <div className="font-semibold mt-0.5">{formatUAH(totalOwedToMe)}</div>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2">
              <div className="flex items-center gap-1 opacity-80 text-xs"><TrendingDown className="size-3" /> {t("balance.iOwe")}</div>
              <div className="font-semibold mt-0.5">{formatUAH(totalIOwe)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-card p-4 shadow-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">{t("budget.monthly")}</p>
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
          <h2 className="text-base font-semibold">{t("groups.active")}</h2>
          <Link to="/groups" className="text-xs text-primary">{t("groups.all")}</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">{t("common.empty")}</p>
          )}
          {groups.map((g) => (
            <div key={g.id} className="relative shrink-0 w-40">
              <Link
                to="/groups/$groupId"
                params={{ groupId: g.id }}
                className="block rounded-2xl bg-card border border-border p-4 shadow-card hover:border-primary/50 transition"
              >
                <div className="size-10 rounded-xl bg-accent flex items-center justify-center text-xl">{g.emoji}</div>
                <p className="mt-3 font-semibold text-sm pr-6">{g.name}</p>
                <p className="text-xs text-muted-foreground">{g.members.length} {t("groups.members")}</p>
              </Link>
              <div className="absolute top-2 right-2">
                <FavoriteToggle groupId={g.id} />
              </div>
            </div>
          ))}
          <AddGroupDialog
            trigger={
              <button className="shrink-0 w-40 rounded-2xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition">
                <Plus className="size-5" />
                <span className="text-xs">{t("groups.new")}</span>
              </button>
            }
          />
        </div>
      </section>

      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{t("activity.recent")}</h2>
          <AddExpenseDialog
            trigger={
              <button className="text-xs text-primary font-medium flex items-center gap-1">
                <Plus className="size-3" /> {t("expense.add")}
              </button>
            }
          />
        </div>
        <div className="space-y-2">
          {recent.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t("activity.empty")}</p>
          )}
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

      {/* Floating Add Expense FAB lives in BottomNav (center button) */}
    </MobileShell>
  );
}
