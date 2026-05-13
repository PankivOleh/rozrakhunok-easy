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
  const [membersText, setMembersText] = useState("");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Введіть назву");
      return;
    }
    addGroup({
      name: name.trim(),
      emoji,
      memberNames: membersText.split(",").map((s) => s.trim()).filter(Boolean),
    });
    toast.success("✓");
    setName(""); setMembersText(""); setEmoji(EMOJIS[0]);
    setOpen(false);
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
          <Input value={membersText} onChange={(e) => setMembersText(e.target.value)} placeholder="Учасники через кому (необов'язково)" className="h-12 rounded-xl" />
          <Button onClick={submit} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow">
            {t("common.add")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
