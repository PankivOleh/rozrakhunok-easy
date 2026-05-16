import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Вхід — Оплата та Поділ" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : "" }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, sendPasswordReset } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: search.redirect || "/" });
  }, [user, navigate, search.redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate({ to: search.redirect || "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) { toast.error("Вкажіть email"); return; }
    setResetBusy(true);
    try {
      await sendPasswordReset(resetEmail.trim());
      toast.success("Лист для скидання пароля надіслано");
      setResetOpen(false);
      setResetEmail("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResetBusy(false);
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
        <div className="flex items-center justify-between mt-4">
          <Link to="/register" search={{ redirect: search.redirect }} className="text-sm text-primary">
            {t("auth.toRegister")}
          </Link>
          <Dialog open={resetOpen} onOpenChange={(o) => { setResetOpen(o); if (o) setResetEmail(email); }}>
            <DialogTrigger asChild>
              <button type="button" className="text-sm text-muted-foreground hover:text-primary transition">
                Забули пароль?
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-3xl">
              <DialogHeader>
                <DialogTitle>Скидання пароля</DialogTitle>
              </DialogHeader>
              <form onSubmit={submitReset} className="space-y-3">
                <p className="text-sm text-muted-foreground">Ми надішлемо посилання для скидання пароля на вашу пошту.</p>
                <Input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="Email" className="h-12 rounded-xl" />
                <Button type="submit" disabled={resetBusy} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold">
                  {resetBusy ? "..." : "Надіслати посилання"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
