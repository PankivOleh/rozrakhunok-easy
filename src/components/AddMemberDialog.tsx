import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";

export function AddMemberDialog({ trigger, groupId }: { trigger: React.ReactNode; groupId: string }) {
  const { addMember } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const submit = () => {
    if (!name.trim()) {
      toast.error("Введіть імʼя");
      return;
    }
    addMember(groupId, name);
    setName("");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Додати учасника</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Імʼя"
            className="h-12 rounded-xl"
            autoFocus
          />
          <Button onClick={submit} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold">
            Додати
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
