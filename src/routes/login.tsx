import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Вхід — Оплата та Поділ" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto size-16 rounded-3xl gradient-primary shadow-glow flex items-center justify-center text-2xl font-bold text-primary-foreground">₴</div>
          <h1 className="mt-4 text-2xl font-bold">{t("app.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.login")}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} className="h-12 rounded-xl" />
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} className="h-12 rounded-xl" />
          <Button type="submit" disabled={busy} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow">
            {busy ? "..." : t("auth.submitLogin")}
          </Button>
        </form>
        <Link to="/register" className="block text-center text-sm text-primary mt-4">
          {t("auth.toRegister")}
        </Link>
      </div>
    </div>
  );
}
