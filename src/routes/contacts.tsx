import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { localAuthService, type LocalUser } from "@/services/localAuthService";
import { Search, UserPlus, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contacts")({
  head: () => ({ meta: [{ title: "Контакти — Оплата та Поділ" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const { user, addContact, removeContact } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocalUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      setResults(localAuthService.searchByUsername(query).filter((u) => u.id !== user?.id));
      setSearching(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, user?.id]);

  const contacts = (user?.contacts ?? [])
    .map((id) => localAuthService.getById(id))
    .filter(Boolean) as LocalUser[];

  const isContact = (id: string) => (user?.contacts ?? []).includes(id);

  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="size-5 text-primary" /> Контакти
        </h1>
        <p className="text-sm text-muted-foreground">Шукайте друзів за username</p>
      </header>

      <section className="px-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="@username або імʼя"
            className="h-12 rounded-xl pl-10"
          />
        </div>
      </section>

      {query.trim() && (
        <section className="px-5 mt-4">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2">Результати пошуку</h2>
          {searching ? (
            <div className="flex justify-center py-6">
              <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Нікого не знайдено</p>
          ) : (
            <div className="space-y-2">
              {results.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  inContacts={isContact(u.id)}
                  onAdd={async () => { await addContact(u.id); toast.success(`${u.displayName} додано`); }}
                  onRemove={async () => { await removeContact(u.id); toast.success("Прибрано"); }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="px-5 mt-6">
        <h2 className="text-sm font-semibold mb-2">Мої контакти ({contacts.length})</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Поки порожньо</p>
        ) : (
          <div className="space-y-2">
            {contacts.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                inContacts
                onAdd={() => {}}
                onRemove={async () => { await removeContact(u.id); toast.success("Прибрано"); }}
              />
            ))}
          </div>
        )}
      </section>
    </MobileShell>
  );
}

function UserRow({
  u, inContacts, onAdd, onRemove,
}: {
  u: LocalUser; inContacts: boolean; onAdd: () => void; onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
      <div className="size-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
        {u.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{u.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
      </div>
      {inContacts ? (
        <Button size="sm" variant="ghost" onClick={onRemove} className="text-muted-foreground">
          <UserMinus className="size-4" />
        </Button>
      ) : (
        <Button size="sm" onClick={onAdd} className="rounded-full gradient-primary text-primary-foreground">
          <UserPlus className="size-4 mr-1" /> Додати
        </Button>
      )}
    </div>
  );
}
