import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/app-context";
import { useI18n } from "@/lib/i18n-context";
import { formatUAH } from "@/lib/split";
import { toast } from "sonner";

export function AddExpenseDialog({
  trigger,
  groupId: forcedGroupId,
}: {
  trigger: React.ReactNode;
  groupId?: string;
}) {
  const { t } = useI18n();
  const { groups, currentUserId, addExpense } = useApp();
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(forcedGroupId ?? "");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [payerId, setPayerId] = useState(currentUserId);
  const [splitType, setSplitType] = useState<"equal" | "unequal">("equal");
  const [recurring, setRecurring] = useState(false);
  const [shares, setShares] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (forcedGroupId) setGroupId(forcedGroupId);
    else if (!groupId && groups[0]) setGroupId(groups[0].id);
  }, [forcedGroupId, groupId, groups]);

  const activeGroup = groups.find((g) => g.id === (forcedGroupId ?? groupId));
  const total = parseFloat(amount) || 0;
  const sharesSum = useMemo(
    () => Object.values(shares).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [shares],
  );
  const sharesValid = splitType === "equal" || Math.abs(sharesSum - total) < 0.01;

  const reset = () => {
    setAmount("");
    setDesc("");
    setRecurring(false);
    setSplitType("equal");
    setPayerId(currentUserId);
    setShares({});
  };

  const submit = async () => {
    if (!activeGroup) { toast.error("Спочатку створіть групу"); return; }
    if (!total || total <= 0) { toast.error("Вкажіть коректну суму"); return; }
    if (!desc.trim()) { toast.error("Додайте опис витрати"); return; }
    if (splitType === "unequal" && !sharesValid) {
      toast.error(`Сума часток (${formatUAH(sharesSum)}) має дорівнювати ${formatUAH(total)}`);
      return;
    }
    setBusy(true);
    try {
      const sharesObj = splitType === "unequal"
        ? Object.fromEntries(
            activeGroup.members
              .map((m) => [m.id, parseFloat(shares[m.id] || "0") || 0] as const)
              .filter(([, v]) => v > 0),
          )
        : undefined;
      const participants = sharesObj
        ? Object.keys(sharesObj)
        : activeGroup.members.map((m) => m.id);
      await addExpense({
        groupId: activeGroup.id,
        amount: total,
        description: desc.trim(),
        payerId,
        splitType,
        recurring,
        participants,
        shares: sharesObj,
      });
      toast.success("Витрату додано");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("expense.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {groups.length === 0 ? (
            <p className="rounded-2xl bg-surface p-4 text-sm text-muted-foreground text-center">Створіть першу групу, щоб додати витрату.</p>
          ) : (
            <>
              {!forcedGroupId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Група</p>
                  <div className="flex gap-2 flex-wrap">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => { setGroupId(g.id); setPayerId(currentUserId); setShares({}); }}
                        className={`px-3 h-9 rounded-full text-xs border transition ${
                          groupId === g.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {g.emoji} {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("expense.amount")} className="h-12 rounded-xl text-lg font-semibold" />
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("expense.description")} className="h-12 rounded-xl" />
              {activeGroup && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t("expense.payer")}</p>
                  <div className="flex gap-2 flex-wrap">
                    {activeGroup.members.map((m) => (
                      <button key={m.id} onClick={() => setPayerId(m.id)} className={`px-3 h-9 rounded-full text-xs border transition ${
                        payerId === m.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                      }`}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">
                <span className="text-sm">{t("expense.recurring")}</span>
                <Switch checked={recurring} onCheckedChange={setRecurring} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSplitType("equal")} className={`h-10 rounded-xl text-sm border transition ${
                  splitType === "equal" ? "bg-accent border-primary text-foreground" : "border-border text-muted-foreground"
                }`}>
                  {t("expense.equal")}
                </button>
                <button onClick={() => setSplitType("unequal")} className={`h-10 rounded-xl text-sm border transition ${
                  splitType === "unequal" ? "bg-accent border-primary text-foreground" : "border-border text-muted-foreground"
                }`}>
                  {t("expense.unequal")}
                </button>
              </div>
              {splitType === "unequal" && activeGroup && (
                <div className="rounded-2xl bg-surface p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Скільки винен кожен учасник</p>
                  {activeGroup.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{m.name}</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={shares[m.id] ?? ""}
                        onChange={(e) => setShares((p) => ({ ...p, [m.id]: e.target.value }))}
                        placeholder="0"
                        className="h-9 w-24 rounded-lg text-right text-sm"
                      />
                      <span className="text-xs text-muted-foreground">₴</span>
                    </div>
                  ))}
                  <div className={`flex justify-between text-xs pt-2 border-t border-border ${sharesValid ? "text-success" : "text-destructive"}`}>
                    <span>Сума</span>
                    <span className="font-semibold">{formatUAH(sharesSum)} / {formatUAH(total)}</span>
                  </div>
                </div>
              )}
              <Button disabled={busy || (splitType === "unequal" && !sharesValid)} onClick={submit} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow disabled:opacity-50">
                {busy ? "..." : t("expense.add")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
