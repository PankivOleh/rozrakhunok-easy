import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellRing, CalendarClock, XCircle } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { formatUAH } from "@/lib/split";
import { toast } from "sonner";

const INTERVALS = [
  { value: "1", label: "Щодня (1 день)" },
  { value: "3", label: "Кожні 3 дні" },
  { value: "7", label: "Щотижня (7 днів)" },
  { value: "14", label: "Кожні 14 днів" },
  { value: "30", label: "Щомісяця (30 днів)" },
];

export function RemindPopover({
  groupId,
  groupName,
  debtorId,
  debtorName,
  amount,
  debtId,
}: {
  groupId: string;
  groupName: string;
  debtorId: string;
  debtorName: string;
  amount: number;
  debtId?: string;
}) {
  const { user } = useAuth();
  const { reminders, scheduleReminder, cancelReminder, sendDebtReminder } = useApp();
  const [open, setOpen] = useState(false);
  const [interval, setInterval] = useState("7");
  const [busy, setBusy] = useState(false);
  const existing = reminders.find(
    (r) => r.groupId === groupId && r.creditorId === user?.id && r.debtorId === debtorId,
  );

  const remindNow = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await sendDebtReminder(
        groupId,
        debtorId,
        user.id,
        amount,
        `Нагадування: борг ${formatUAH(amount)} перед ${user.displayName} у "${groupName}"`,
        { creditorName: user.displayName, groupName, debtId },
      );
      toast.success(`Нагадування надіслано ${debtorName} (in-app + email)`);
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveAuto = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await scheduleReminder({
        groupId,
        creditorId: user.id,
        debtorId,
        intervalDays: Number(interval),
        amount,
        debtId,
      });
      toast.success(`Авто-нагадування активовано (кожні ${interval} дн.)`);
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
      toast.success("Авто-нагадування скасовано");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs">
          <Bell className="size-3.5 mr-1" /> Нагадати
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Нагадати зараз</p>
          <Button
            onClick={remindNow}
            disabled={busy}
            className="w-full h-10 rounded-xl gradient-primary text-primary-foreground"
          >
            <BellRing className="size-4 mr-2" /> Надіслати {formatUAH(amount)}
          </Button>
        </div>
        <div className="p-3 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <CalendarClock className="size-3.5" /> Автонагадування
          </p>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVALS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {existing && (
            <p className="text-[11px] text-muted-foreground">
              Активно: кожні {existing.intervalDays} дн.
              {existing.lastRemindedAt &&
                ` · востаннє ${new Date(existing.lastRemindedAt).toLocaleDateString("uk-UA")}`}
            </p>
          )}
          <div className="flex gap-2">
            {existing && (
              <Button
                disabled={busy}
                variant="outline"
                onClick={stop}
                className="flex-1 h-10 rounded-xl text-xs"
              >
                <XCircle className="size-3.5 mr-1" /> Скасувати
              </Button>
            )}
            <Button
              disabled={busy}
              onClick={saveAuto}
              className="flex-1 h-10 rounded-xl text-xs gradient-primary text-primary-foreground"
            >
              {existing ? "Оновити" : "Активувати"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
