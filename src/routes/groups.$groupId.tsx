import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Plus, QrCode, Repeat } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { AsyncStatus } from "@/components/AsyncStatus";
import { useApp } from "@/lib/app-context";
import { calcMemberBalances, formatUAH, optimizeSettlements } from "@/lib/split";
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
  const { getGroup, expenses, addExpense, currentUserId } = useApp();
  const group = getGroup(groupId);

  const [tab, setTab] = useState<"split" | "debts">("split");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [splitType, setSplitType] = useState<"equal" | "unequal">("equal");
  const [payerId, setPayerId] = useState(currentUserId);

  const balances = useMemo(
    () => (group ? calcMemberBalances(group, expenses) : {}),
    [group, expenses],
  );
  const settlements = useMemo(() => optimizeSettlements(balances), [balances]);
  const groupExpenses = useMemo(
    () => (group ? expenses.filter((e) => e.groupId === group.id) : []),
    [group, expenses],
  );

  if (!group) {
    return (
      <MobileShell>
        <div className="p-8 text-center text-muted-foreground">Групу не знайдено</div>
      </MobileShell>
    );
  }

  const memberName = (id: string) => group.members.find((m) => m.id === id)?.name ?? "—";
  const initials = (name: string) => name.slice(0, 1).toUpperCase();

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!amt || !desc.trim()) {
      toast.error("Введіть суму та опис");
      return;
    }
    addExpense({
      groupId: group.id,
      amount: amt,
      description: desc.trim(),
      payerId,
      splitType,
      recurring,
    });
    setAmount("");
    setDesc("");
    setRecurring(false);
    toast.success("Витрату додано");
  };

  return (
    <MobileShell>
      <AsyncStatus />
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/" })}
          className="size-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{group.members.length} учасників</p>
          <h1 className="font-bold flex items-center gap-2">
            <span>{group.emoji}</span> {group.name}
          </h1>
        </div>
        <button className="px-3 h-10 rounded-full gradient-primary text-primary-foreground text-xs font-medium flex items-center gap-1 shadow-glow">
          <QrCode className="size-4" /> Запросити
        </button>
      </header>

      <section className="px-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {group.members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1 shrink-0">
              <div className="size-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                {initials(m.name)}
              </div>
              <span className="text-[10px] text-muted-foreground">{m.name}</span>
            </div>
          ))}
          <button className="size-12 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
            <Plus className="size-4" />
          </button>
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
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Загальна сума, ₴"
                className="h-12 rounded-xl text-lg font-semibold"
              />
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Опис (напр. М'ясо)"
                className="h-12 rounded-xl"
              />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Хто заплатив</p>
                <div className="flex gap-2 flex-wrap">
                  {group.members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPayerId(m.id)}
                      className={`px-3 h-9 rounded-full text-xs border transition ${
                        payerId === m.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
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
                <button
                  onClick={() => setSplitType("equal")}
                  className={`h-10 rounded-xl text-sm border transition ${
                    splitType === "equal"
                      ? "bg-accent border-primary text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Порівну
                </button>
                <button
                  onClick={() => setSplitType("unequal")}
                  className={`h-10 rounded-xl text-sm border transition ${
                    splitType === "unequal"
                      ? "bg-accent border-primary text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Нерівномірно
                </button>
              </div>

              <Button onClick={handleAdd} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow text-base">
                Додати витрату
              </Button>
            </div>
          </section>

          <section className="px-5 mt-5">
            <h3 className="text-sm font-semibold mb-2">Смарт-розрахунки</h3>
            <SettlementsList settlements={settlements} memberName={memberName} />
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
            <SettlementsList settlements={settlements} memberName={memberName} />
          </div>
        </section>
      )}
    </MobileShell>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-10 rounded-xl text-sm font-medium transition ${
        active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SettlementsList({
  settlements,
  memberName,
}: {
  settlements: { fromId: string; toId: string; amount: number }[];
  memberName: (id: string) => string;
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
      {settlements.map((s, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
          <span className="text-sm font-medium">{memberName(s.fromId)}</span>
          <ArrowRight className="size-4 text-primary" />
          <span className="text-sm font-medium">{memberName(s.toId)}</span>
          <span className="ml-auto text-sm font-semibold text-primary">{formatUAH(s.amount)}</span>
        </div>
      ))}
    </div>
  );
}
