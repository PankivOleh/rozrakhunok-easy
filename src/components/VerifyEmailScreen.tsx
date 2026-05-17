import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MailWarning, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { authService } from "@/services/authService";
import { toast } from "sonner";

/** Strict gate: signed-in users with unverified email cannot enter the app. */
export function VerifyEmailScreen() {
  const { user, signOut, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  // Poll: reload Firebase user every 5s so emailVerified flips automatically.
  useEffect(() => {
    const id = window.setInterval(async () => {
      try { await authService.reloadCurrent(); } catch { /* noop */ }
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const resend = async () => {
    setBusy(true);
    try {
      await resendVerification();
      toast.success("Лист підтвердження надіслано");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      await authService.reloadCurrent();
      toast.success("Перевірено. Якщо лист підтверджено — оновлюємо…");
    } finally {
      setChecking(false);
    }
  };

  const logout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto size-16 rounded-3xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
          <MailWarning className="size-7 text-yellow-500" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Очікування підтвердження</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ми надіслали лист з посиланням для підтвердження на:
        </p>
        <p className="mt-1 text-sm font-medium text-foreground break-all">{user?.email}</p>
        <p className="mt-3 text-xs text-yellow-500/90 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
          Якщо листа немає, обов'язково перевірте папку <strong>Спам (Spam)</strong>.
        </p>
        <div className="mt-5 space-y-2">
          <Button onClick={checkNow} disabled={checking} className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold">
            <RefreshCw className={`size-4 mr-2 ${checking ? "animate-spin" : ""}`} /> Я підтвердив(-ла)
          </Button>
          <Button onClick={resend} disabled={busy} variant="outline" className="w-full h-11 rounded-xl">
            {busy ? "..." : "Надіслати лист ще раз"}
          </Button>
          <Button onClick={logout} variant="ghost" className="w-full h-10 rounded-xl text-muted-foreground">
            <LogOut className="size-4 mr-2" /> Вийти
          </Button>
        </div>
      </div>
    </div>
  );
}
