import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { localAuthService, type LocalUser } from "@/services/localAuthService";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export function AddMemberDialog({ trigger, groupId }: { trigger: React.ReactNode; groupId: string }) {
  const { addMember } = useApp();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");

  const results: LocalUser[] = query.trim()
    ? localAuthService.searchByUsername(query).filter((u) => u.id !== user?.id)
    : (user?.contacts ?? []).map((id) => localAuthService.getById(id)).filter(Boolean) as LocalUser[];

  const submitFree = () => {
    if (!name.trim()) { toast.error("Введіть імʼя"); return; }
    addMember(groupId, { name });
    toast.success("Додано");
    setName("");
    setOpen(false);
  };

  const addRegistered = (u: LocalUser) => {
    addMember(groupId, { id: u.id, name: u.displayName });
    toast.success(`${u.displayName} додано`);
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук за @username або імʼям"
            className="h-11 rounded-xl"
          />
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {results.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {query ? "Нікого не знайдено" : "Введіть username для пошуку"}
              </p>
            )}
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => addRegistered(u)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition text-left"
              >
                <div className="size-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {u.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                </div>
                <UserPlus className="size-4 text-primary" />
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Або додати без акаунту</p>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Імʼя" className="h-11 rounded-xl" />
              <Button onClick={submitFree} className="h-11 rounded-xl">Додати</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
