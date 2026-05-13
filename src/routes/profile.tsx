import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Trash2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Профіль — Оплата та Поділ" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success("✓");
    navigate({ to: "/login" });
  };

  const handleDelete = () => {
    if (!user) return;
    if (!confirm("Видалити акаунт і всі дані?")) return;
    try {
      const raw = localStorage.getItem("ps_users");
      const users = raw ? JSON.parse(raw) : [];
      localStorage.setItem("ps_users", JSON.stringify(users.filter((u: { id: string }) => u.id !== user.id)));
      localStorage.removeItem(`ps_app_state_v1_${user.id}`);
    } catch { /* noop */ }
    handleLogout();
  };

  if (!user) return null;
  const initial = user.displayName.slice(0, 1).toUpperCase();

  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/" })}
          className="size-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="font-bold text-lg">{t("profile.title")}</h1>
      </header>

      <section className="px-5">
        <div className="rounded-3xl gradient-card p-6 shadow-glow text-primary-foreground flex items-center gap-4">
          <div className="size-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">{initial}</div>
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate">{user.displayName}</p>
            <p className="text-sm opacity-80 truncate">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="px-5 mt-5 space-y-2">
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground">{t("profile.name")}</p>
          <p className="text-sm font-medium">{user.displayName}</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground">{t("profile.email")}</p>
          <p className="text-sm font-medium">{user.email}</p>
        </div>
      </section>

      <section className="px-5 mt-6 space-y-2">
        <Button onClick={handleLogout} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow">
          <LogOut className="size-4 mr-2" />
          {t("profile.logout")}
        </Button>
        <Button onClick={handleDelete} variant="outline" className="w-full h-12 rounded-xl text-destructive border-destructive/40">
          <Trash2 className="size-4 mr-2" />
          {t("profile.delete")}
        </Button>
      </section>
    </MobileShell>
  );
}
