import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Реєстрація — Оплата та Поділ" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : "" }),
  component: RegisterPage,
});

function RegisterPage() {
  const { signUp, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = useSearch({ from: "/register" });
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: search.redirect || "/" });
  }, [user, navigate, search.redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      toast.error("Заповніть усі поля");
      return;
    }
    setBusy(true);
    try {
      await signUp(email.trim(), password, name.trim(), username.trim());
      toast.success("Акаунт створено");
      navigate({ to: search.redirect || "/" });
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
          <p className="text-sm text-muted-foreground mt-1">{t("auth.register")}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Імʼя" className="h-12 rounded-xl" />
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
            placeholder="@username"
            className="h-12 rounded-xl"
            maxLength={20}
          />
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-12 rounded-xl" />
          <Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль (мін. 6)" className="h-12 rounded-xl" />
          <Button type="submit" disabled={busy} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow">
            {busy ? "..." : t("auth.submitRegister")}
          </Button>
        </form>
        <Link to="/login" search={{ redirect: search.redirect }} className="block text-center text-sm text-primary mt-4">
          {t("auth.toLogin")}
        </Link>
      </div>
    </div>
  );
}
