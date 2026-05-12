import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { Link } from "@tanstack/react-router";
import { formatUAH } from "@/lib/split";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Пошук — Оплата та Поділ" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const { groups, expenses } = useApp();
  const ql = q.toLowerCase().trim();
  const fGroups = ql ? groups.filter((g) => g.name.toLowerCase().includes(ql)) : groups;
  const fExp = ql ? expenses.filter((e) => e.description.toLowerCase().includes(ql)) : [];

  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold mb-3">Пошук</h1>
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Шукати групи або витрати"
            className="h-12 pl-9 rounded-xl"
          />
        </div>
      </header>
      <section className="px-5">
        <h2 className="text-xs uppercase text-muted-foreground mb-2">Групи</h2>
        <div className="space-y-2">
          {fGroups.map((g) => (
            <Link key={g.id} to="/groups/$groupId" params={{ groupId: g.id }}
              className="block rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
              <span className="text-xl">{g.emoji}</span>
              <span className="font-medium text-sm">{g.name}</span>
            </Link>
          ))}
        </div>
        {fExp.length > 0 && (
          <>
            <h2 className="text-xs uppercase text-muted-foreground mb-2 mt-4">Витрати</h2>
            <div className="space-y-2">
              {fExp.map((e) => (
                <div key={e.id} className="rounded-2xl bg-card border border-border p-3 flex items-center justify-between">
                  <span className="text-sm">{e.description}</span>
                  <span className="text-sm font-semibold">{formatUAH(e.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </MobileShell>
  );
}
