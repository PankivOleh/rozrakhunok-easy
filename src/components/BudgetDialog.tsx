import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function BudgetDialog({ trigger }: { trigger: React.ReactNode }) {
  const { monthlyBudget, setMonthlyBudget } = useApp();
  const { updateUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(monthlyBudget ?? 2000));
  const [busy, setBusy] = useState(false);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) setDraft(String(monthlyBudget ?? 2000));
  };

  const save = async () => {
    const v = parseFloat(draft);
    if (!v || v <= 0) { toast.error("Вкажіть коректний бюджет"); return; }
    setBusy(true);
    try {
      await setMonthlyBudget(v);
      toast.success("Бюджет оновлено");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resetMonth = async () => {
    setBusy(true);
    try {
      await updateUser({ budgetResetAt: new Date().toISOString() });
      toast.success("Витрати місяця скинуто");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Місячний бюджет</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Встановіть максимальний ліміт витрат на місяць.</p>
          <Input
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ліміт, ₴"
            className="h-12 rounded-xl text-lg font-semibold"
          />
          <Button onClick={save} disabled={busy} className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold">
            {busy ? "..." : "Зберегти"}
          </Button>
          <Button onClick={resetMonth} disabled={busy} variant="outline" className="w-full h-11 rounded-xl">
            <RotateCcw className="size-4 mr-2" /> Скинути витрати місяця
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
