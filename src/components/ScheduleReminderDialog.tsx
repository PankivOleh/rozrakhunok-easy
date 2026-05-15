import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp, type ReminderFrequency } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { formatUAH } from "@/lib/split";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";

export function ScheduleReminderDialog({ trigger, groupId, groupName, debtorId, debtorName, amount }: { trigger: React.ReactNode; groupId: string; groupName: string; debtorId: string; debtorName: string; amount: number }) {
  const { user } = useAuth();
  const { reminders, scheduleReminder, cancelReminder, sendDebtReminder } = useApp();
  const [open, setOpen] = useState(false);
  const [freq, setFreq] = useState<ReminderFrequency>("weekly");
  const [busy, setBusy] = useState(false);
  const existing = reminders.find((r) => r.groupId === groupId && r.creditorId === user?.id && r.debtorId === debtorId);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await scheduleReminder({ groupId, creditorId: user.id, debtorId, frequency: freq, amount });
      await sendDebtReminder(groupId, debtorId, user.id, amount, `${user.displayName} налаштував(ла) автонагадування (${labelFor(freq)}) у "${groupName}" — ${formatUAH(amount)}`);
      toast.success("Регулярне нагадування активовано");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await cancelReminder(existing.id, existing.groupId);
      toast.success("Скасовано");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><CalendarClock className="size-5 text-primary" /> Регулярні нагадування</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Нагадувати <span className="font-medium text-foreground">{debtorName}</span> про борг {formatUAH(amount)} у &laquo;{groupName}&raquo;.</p>
          <div className="grid grid-cols-3 gap-2">
            {(["daily", "weekly", "monthly"] as const).map((f) => <button key={f} onClick={() => setFreq(f)} className={`h-11 rounded-xl text-sm border transition ${freq === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>{labelFor(f)}</button>)}
          </div>
          {existing && <p className="text-xs text-muted-foreground">Активно: {labelFor(existing.frequency)}{existing.lastRemindedAt && ` · востаннє ${new Date(existing.lastRemindedAt).toLocaleDateString("uk-UA")}`}</p>}
          <div className="flex gap-2">
            {existing && <Button disabled={busy} variant="outline" onClick={stop} className="flex-1 h-11 rounded-xl">Скасувати</Button>}
            <Button disabled={busy} onClick={save} className="flex-1 h-11 rounded-xl gradient-primary text-primary-foreground">{busy ? "..." : existing ? "Оновити" : "Активувати"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function labelFor(f: ReminderFrequency) { return f === "daily" ? "Щодня" : f === "weekly" ? "Щотижня" : "Щомісяця"; }
