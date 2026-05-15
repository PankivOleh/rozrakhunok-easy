import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { authService } from "@/services/authService";
import type { PublicUser } from "@/types/database";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export function AddMemberDialog({ trigger, groupId }: { trigger: React.ReactNode; groupId: string }) {
  const { addMember } = useApp();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      authService.searchUsers(query)
        .then((items) => setResults(items.filter((item) => item.id !== user?.id)))
        .catch((err) => toast.error((err as Error).message))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, user?.id]);

  const addRegistered = async (u: PublicUser) => {
    try {
      await addMember(groupId, { id: u.id, name: u.displayName });
      toast.success(`${u.displayName} додано`);
      setOpen(false);
      setQuery("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Додати учасника</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пошук за @username або імʼям" className="h-11 rounded-xl" />
          <div className="max-h-60 overflow-y-auto space-y-1.5">
            {searching && <div className="mx-auto my-4 size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
            {!searching && results.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {query ? "Нікого не знайдено" : "Введіть username для пошуку"}
              </p>
            )}
            {results.map((u) => (
              <button key={u.id} onClick={() => addRegistered(u)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition text-left">
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
          <p className="text-xs text-muted-foreground">У production-режимі учасники додаються лише як зареєстровані користувачі.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
