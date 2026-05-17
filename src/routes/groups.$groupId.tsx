import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, QrCode, Repeat } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { QrInviteDialog } from "@/components/QrInviteDialog";
import { AddMemberDialog } from "@/components/AddMemberDialog";
import { RemindPopover } from "@/components/RemindPopover";
import { FavoriteToggle } from "@/components/FavoriteToggle";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { calcMemberBalances, formatUAH, optimizeSettlements, type Settlement } from "@/lib/split";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/groups/$groupId")({
  head: ({ params }) => ({
    meta: [
      { title: `Група — ${params.groupId}` },
      { name: "description", content: "Деталі групи, витрати та смарт-розрахунки." },
    ],
  }),
  component: GroupPage,
  notFoundComponent: () => <div className="p-8 text-center">Групу не знайдено</div>,
});

function GroupPage() {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const { getGroup, expenses, settlements: settleRecords, addExpense, settleDebt, currentUserId, loading } = useApp();
  const { user } = useAuth();
  const group = getGroup(groupId);

  const [tab, setTab] = useState<"split" | "debts">("split");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [splitType, setSplitType] = useState<"equal" | "unequal">("equal");
  const [payerId, setPayerId] = useState(currentUserId);
  const [shares, setShares] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const balances = useMemo(
    () => (group ? calcMemberBalances(group, expenses, settleRecords) : {}),
    [group, expenses, settleRecords],
  );
  const settlements = useMemo(() => optimizeSettlements(balances), [balances]);
  const groupExpenses = useMemo(
    () => (group ? expenses.filter((e) => e.groupId === group.id) : []),
    [group, expenses],
  );

  const total = parseFloat(amount) || 0;
  const sharesSum = Object.values(shares).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const sharesValid = splitType === "equal" || Math.abs(sharesSum - total) < 0.01;

  if (loading) {
    return (
      <MobileShell>
        <div className="flex items-center justify-center py-24">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </MobileShell>
    );
  }

  if (!group) {
    return (
      <MobileShell>
        <div className="p-8 text-center text-muted-foreground">Групу не знайдено або у вас немає доступу</div>
      </MobileShell>
    );
  }

  const memberName = (id: string) => group.members.find((m) => m.id === id)?.name ?? "—";
  const initials = (name: string) => name.slice(0, 1).toUpperCase();

  const handleAdd = async () => {
    if (!total || total <= 0) { toast.error("Вкажіть коректну суму"); return; }
    if (!desc.trim()) { toast.error("Додайте опис"); return; }
    if (splitType === "unequal" && !sharesValid) {
      toast.error(`Сума часток (${formatUAH(sharesSum)}) має дорівнювати ${formatUAH(total)}`);
      return;
    }
    setBusy(true);
    try {
      const sharesObj = splitType === "unequal"
        ? Object.fromEntries(
            group.members
              .map((m) => [m.id, parseFloat(shares[m.id] || "0") || 0] as const)
              .filter(([, v]) => v > 0),
          )
        : undefined;
      const participants = splitType === "unequal" && sharesObj
        ? Object.keys(sharesObj)
        : group.members.map((m) => m.id);
      await addExpense({
        groupId: group.id,
        amount: total,
        description: desc.trim(),
        payerId,
        splitType,
        recurring,
        participants,
        shares: sharesObj,
      });
      setAmount("");
      setDesc("");
      setRecurring(false);
      setShares({});
      toast.success("Витрату додано");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSettle = async (s: Settlement) => {
    try {
      await settleDebt(group.id, s.fromId, s.toId, s.amount);
      toast.success(`Борг ${formatUAH(s.amount)} погашено`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const saveBudget = async () => {
    const v = parseFloat(budgetDraft);
    if (!v || v <= 0) { toast.error("Вкажіть коректний бюджет"); return; }
    try {
      await setMonthlyBudget(v);
      toast.success("Бюджет оновлено");
      setBudgetOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const resetMonth = async () => {
    try {
      await updateUser({ budgetResetAt: new Date().toISOString() });
      toast.success("Витрати місяця скинуто");
      setBudgetOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate({ to: "/" })} className="size-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center shrink-0">
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="font-bold flex items-center gap-2 truncate">
            <span>{group.emoji}</span> {group.name}
          </h1>
          <FavoriteToggle groupId={group.id} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Popover open={budgetOpen} onOpenChange={(o) => { setBudgetOpen(o); if (o) setBudgetDraft(String(monthlyBudget ?? 2000)); }}>
            <PopoverTrigger asChild>
              <button className="size-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center" aria-label="Налаштування бюджету">
                <Settings2 className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 rounded-2xl space-y-3">
              <p className="text-sm font-semibold">Місячний бюджет</p>
              <Input type="number" inputMode="decimal" value={budgetDraft} onChange={(e) => setBudgetDraft(e.target.value)} placeholder="Ліміт, ₴" className="h-11 rounded-xl" />
              <Button onClick={saveBudget} className="w-full h-10 rounded-xl gradient-primary text-primary-foreground">Зберегти</Button>
              <Button onClick={resetMonth} variant="outline" className="w-full h-10 rounded-xl">
                <RotateCcw className="size-4 mr-2" /> Скинути витрати місяця
              </Button>
            </PopoverContent>
          </Popover>
          <QrInviteDialog
            groupId={group.id}
            groupName={group.name}
            trigger={
              <button className="px-3 h-10 rounded-full gradient-primary text-primary-foreground text-xs font-medium flex items-center gap-1 shadow-glow">
                <QrCode className="size-4" /> Запросити
              </button>
            }
          />
        </div>
      </header>

      <section className="px-5">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {group.members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1 shrink-0 w-14">
              <div className="size-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                {initials(m.name)}
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-full text-center">{m.name}</span>
            </div>
          ))}
          <AddMemberDialog
            groupId={group.id}
            trigger={
              <div className="flex flex-col items-center gap-1 shrink-0 w-14">
                <button className="size-12 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition">
                  <Plus className="size-4" />
                </button>
                <span className="text-[10px] text-muted-foreground text-center">Додати</span>
              </div>
            }
          />
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="bg-surface-elevated rounded-2xl p-1 flex">
          <TabBtn active={tab === "split"} onClick={() => setTab("split")}>Поділ чека</TabBtn>
          <TabBtn active={tab === "debts"} onClick={() => setTab("debts")}>Загальні борги</TabBtn>
        </div>
      </section>

      {tab === "split" && (
        <>
          <section className="px-5 mt-4">
            <div className="rounded-3xl bg-card border border-border p-4 shadow-card space-y-3">
              <p className="text-sm font-semibold">Нова витрата</p>
              <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Загальна сума, ₴" className="h-12 rounded-xl text-lg font-semibold" />
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Опис (напр. М'ясо)" className="h-12 rounded-xl" />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Хто заплатив</p>
                <div className="flex gap-2 flex-wrap">
                  {group.members.map((m) => (
                    <button key={m.id} onClick={() => setPayerId(m.id)}
                      className={`px-3 h-9 rounded-full text-xs border transition ${payerId === m.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Repeat className="size-4 text-primary" />
                  Регулярний платіж
                </div>
                <Switch checked={recurring} onCheckedChange={setRecurring} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSplitType("equal")}
                  className={`h-10 rounded-xl text-sm border transition ${splitType === "equal" ? "bg-accent border-primary text-foreground" : "border-border text-muted-foreground"}`}>
                  Порівну
                </button>
                <button onClick={() => setSplitType("unequal")}
                  className={`h-10 rounded-xl text-sm border transition ${splitType === "unequal" ? "bg-accent border-primary text-foreground" : "border-border text-muted-foreground"}`}>
                  Нерівномірно
                </button>
              </div>

              {splitType === "unequal" && (
                <div className="rounded-2xl bg-surface p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Введіть точну суму для кожного учасника</p>
                  {group.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="size-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                        {initials(m.name)}
                      </div>
                      <span className="text-sm flex-1 truncate">{m.name}</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={shares[m.id] ?? ""}
                        onChange={(e) => setShares((p) => ({ ...p, [m.id]: e.target.value }))}
                        placeholder="0"
                        className="h-9 w-24 rounded-lg text-right text-sm"
                      />
                      <span className="text-xs text-muted-foreground w-3">₴</span>
                    </div>
                  ))}
                  <div className={`flex justify-between text-xs pt-2 border-t border-border ${sharesValid ? "text-success" : "text-destructive"}`}>
                    <span>Сума часток</span>
                    <span className="font-semibold">{formatUAH(sharesSum)} / {formatUAH(total)}</span>
                  </div>
                </div>
              )}

              <Button onClick={handleAdd} disabled={busy || (splitType === "unequal" && !sharesValid)} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow text-base disabled:opacity-50">
                {busy ? "..." : "Додати витрату"}
              </Button>
            </div>
          </section>

          <section className="px-5 mt-5">
            <h3 className="text-sm font-semibold mb-2">Смарт-розрахунки</h3>
            <SettlementsList
              settlements={settlements}
              memberName={memberName}
              currentUserId={currentUserId}
              onSettle={handleSettle}
              groupId={group.id}
              groupName={group.name}
            />
          </section>

          <section className="px-5 mt-5">
            <h3 className="text-sm font-semibold mb-2">Останні витрати</h3>
            <div className="space-y-2">
              {groupExpenses.length === 0 && (
                <p className="text-xs text-muted-foreground">Поки немає витрат</p>
              )}
              {groupExpenses.map((e) => (
                <div key={e.id} className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-accent flex items-center justify-center text-sm font-medium">
                    {initials(memberName(e.payerId))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground">Заплатив: {memberName(e.payerId)}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatUAH(e.amount)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === "debts" && (
        <section className="px-5 mt-4 space-y-4">
          <div className="rounded-2xl bg-card border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Баланси учасників</h3>
            <div className="space-y-2">
              {group.members.map((m) => {
                const v = balances[m.id] ?? 0;
                return (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                        {initials(m.name)}
                      </div>
                      <span>{m.name}</span>
                    </div>
                    <span className={v >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                      {v >= 0 ? "+" : ""}{formatUAH(v)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Мінімізовані транзакції</h3>
            <SettlementsList
              settlements={settlements}
              memberName={memberName}
              currentUserId={currentUserId}
              onSettle={handleSettle}
              groupId={group.id}
              groupName={group.name}
            />
          </div>
        </section>
      )}
      {/* Reference user to keep import used */}
      <span className="hidden">{user?.id}</span>
    </MobileShell>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex-1 h-10 rounded-xl text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}>
      {children}
    </button>
  );
}

function SettlementsList({
  settlements, memberName, currentUserId, onSettle, groupId, groupName,
}: {
  settlements: Settlement[];
  memberName: (id: string) => string;
  currentUserId: string;
  onSettle: (s: Settlement) => void;
  groupId: string;
  groupName: string;
}) {
  if (settlements.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-4 text-center text-sm text-muted-foreground">
        Усі розраховані ✨
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {settlements.map((s, i) => {
        const iAmCreditor = s.toId === currentUserId;
        const iAmDebtor = s.fromId === currentUserId;
        return (
          <div key={`${s.fromId}-${s.toId}-${i}`} className="rounded-2xl bg-card border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center text-xs font-semibold shrink-0">
                {memberName(s.fromId).slice(0, 1).toUpperCase()}
              </div>
              <ArrowRight className="size-4 text-muted-foreground shrink-0" />
              <div className="size-9 rounded-full bg-success/15 text-success flex items-center justify-center text-xs font-semibold shrink-0">
                {memberName(s.toId).slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  <span className="font-medium">{memberName(s.fromId)}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="font-medium">{memberName(s.toId)}</span>
                </p>
                <p className="text-sm font-bold">{formatUAH(s.amount)}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {(iAmDebtor || iAmCreditor) && (
                <Button size="sm" onClick={() => onSettle(s)} className="flex-1 h-9 rounded-xl gradient-primary text-primary-foreground text-xs">
                  <CheckCircle2 className="size-3.5 mr-1" /> Погасити
                </Button>
              )}
              {iAmCreditor && (
                <RemindPopover
                  groupId={groupId}
                  groupName={groupName}
                  debtorId={s.fromId}
                  debtorName={memberName(s.fromId)}
                  amount={s.amount}
                  debtId={`${s.fromId}_${s.toId}`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
