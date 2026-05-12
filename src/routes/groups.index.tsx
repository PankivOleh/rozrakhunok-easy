import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useApp } from "@/lib/app-context";
import { calcMemberBalances, formatUAH } from "@/lib/split";

export const Route = createFileRoute("/groups/")({
  head: () => ({
    meta: [
      { title: "Групи — Оплата та Поділ" },
      { name: "description", content: "Усі ваші групи витрат." },
    ],
  }),
  component: GroupsList,
});

function GroupsList() {
  const { groups, expenses, currentUserId } = useApp();
  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Усі групи</h1>
        <p className="text-sm text-muted-foreground">{groups.length} активних груп</p>
      </header>
      <section className="px-5 space-y-3">
        {groups.map((g) => {
          const bal = calcMemberBalances(g, expenses)[currentUserId] ?? 0;
          return (
            <Link
              key={g.id}
              to="/groups/$groupId"
              params={{ groupId: g.id }}
              className="block rounded-2xl bg-card border border-border p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-accent flex items-center justify-center text-2xl">{g.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.members.length} учасників</p>
                </div>
                <p className={`text-sm font-semibold ${bal >= 0 ? "text-success" : "text-destructive"}`}>
                  {bal >= 0 ? "+" : ""}{formatUAH(bal)}
                </p>
              </div>
            </Link>
          );
        })}
      </section>
    </MobileShell>
  );
}
