import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { useI18n } from "@/lib/i18n-context";
import { toast } from "sonner";

const EMOJIS = ["🍖", "🏔️", "🏠", "🍕", "✈️", "🎉", "☕", "🚗"];

export function AddGroupDialog({ trigger }: { trigger: React.ReactNode }) {
  const { t } = useI18n();
  const { addGroup } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Введіть назву");
      return;
    }
    setBusy(true);
    try {
      await addGroup({ name: name.trim(), emoji });
      toast.success("Групу створено");
      setName("");
      setEmoji(EMOJIS[0]);
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
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("groups.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва групи" className="h-12 rounded-xl" />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Emoji</p>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => setEmoji(em)}
                  className={`size-10 rounded-xl text-xl flex items-center justify-center border transition ${
                    emoji === em ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Учасників додавайте через запрошення або пошук за username.</p>
          <Button disabled={busy} onClick={submit} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow">
            {busy ? "..." : t("common.add")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
