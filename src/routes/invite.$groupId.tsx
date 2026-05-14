import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import { Users } from "lucide-react";

const PENDING_KEY = "ps_pending_invite";

export const Route = createFileRoute("/invite/$groupId")({
  head: () => ({ meta: [{ title: "Запрошення — Оплата та Поділ" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { groupId } = Route.useParams();
  const { user, loading } = useAuth();
  const { getGroup, joinGroup } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // If unauthenticated, store the pending group id and redirect to login.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      try { localStorage.setItem(PENDING_KEY, groupId); } catch { /* noop */ }
      navigate({ to: "/login", search: { redirect: `/invite/${groupId}` } });
    } else {
      // Clear pending; we'll handle via UI confirmation below.
      try {
        const pending = localStorage.getItem(PENDING_KEY);
        if (pending === groupId) localStorage.removeItem(PENDING_KEY);
      } catch { /* noop */ }
    }
  }, [user, loading, groupId, navigate]);

  if (loading || !user) {
    return (
      <MobileShell>
        <div className="flex items-center justify-center py-20">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileShell>
    );
  }

  const group = getGroup(groupId);
  const alreadyMember = group?.members.some((m) => m.id === user.id);

  const accept = async () => {
    setBusy(true);
    try {
      joinGroup(groupId);
      toast.success(group ? `Ви приєдналися до "${group.name}"` : "Ви приєдналися до групи");
      navigate({ to: "/groups/$groupId", params: { groupId } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell>
      <div className="px-5 pt-16 text-center">
        <div className="mx-auto size-20 rounded-3xl gradient-primary shadow-glow flex items-center justify-center text-3xl">
          {group?.emoji ?? "👥"}
        </div>
        <h1 className="mt-6 text-2xl font-bold">
          {group ? `Приєднатися до "${group.name}"?` : "Запрошення в групу"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {group
            ? `${group.members.length} учасників`
            : "Групу не знайдено в цьому пристрої. Якщо ви відкрили посилання іншого користувача, попросіть його надіслати оновлене запрошення."}
        </p>

        {alreadyMember ? (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-success">Ви вже учасник цієї групи</p>
            <Button onClick={() => navigate({ to: "/groups/$groupId", params: { groupId } })} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground">
              Відкрити групу
            </Button>
          </div>
        ) : group ? (
          <div className="mt-8 space-y-3">
            <Button onClick={accept} disabled={busy} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow">
              <Users className="size-4 mr-2" /> {busy ? "..." : "Приєднатися"}
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/" })} className="w-full h-12 rounded-xl">
              Скасувати
            </Button>
          </div>
        ) : (
          <Button onClick={() => navigate({ to: "/" })} className="mt-8 w-full h-12 rounded-xl">
            На головну
          </Button>
        )}
      </div>
    </MobileShell>
  );
}

/** Auto-join after login if a pending invite exists. */
export function consumePendingInvite(): string | null {
  try {
    const id = localStorage.getItem(PENDING_KEY);
    if (id) localStorage.removeItem(PENDING_KEY);
    return id;
  } catch {
    return null;
  }
}
