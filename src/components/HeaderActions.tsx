import { useEffect, useState, type ReactNode } from "react";
import { Bell, Globe, Moon, Sun, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { localNotifService, type Notification } from "@/services/localNotifService";
import { localAuthService } from "@/services/localAuthService";
import { formatUAH } from "@/lib/split";

export function HeaderActions({ children }: { children?: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const off = localNotifService.subscribe(() => setNotifs(localNotifService.list(user.id)));
    return () => { off(); };
  }, [user]);

  useEffect(() => {
    if (notifOpen && user) localNotifService.markAllRead(user.id);
  }, [notifOpen, user]);

  const unread = notifs.filter((n) => !n.read).length;
  const initial = (user?.displayName ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="flex items-center gap-1">
      {children}

      <Popover open={langOpen} onOpenChange={setLangOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label={t("lang.title")}
            className="size-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          >
            <Globe className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <div className="px-2 py-1 text-xs text-muted-foreground">{t("lang.title")}</div>
          {(["uk", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => { setLang(l); setLangOpen(false); }}
              className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm hover:bg-accent"
            >
              <span>{l === "uk" ? "Українська" : "English"}</span>
              {lang === l && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="size-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
      >
        {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </button>

      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetTrigger asChild>
          <button
            aria-label={t("notif.title")}
            className="relative size-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[88%] sm:w-96">
          <SheetHeader>
            <SheetTitle>{t("notif.title")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {notifs.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-12">{t("notif.empty")}</div>
            )}
            {notifs.map((n) => {
              const from = localAuthService.getById(n.fromUserId);
              return (
                <div key={n.id} className={`rounded-2xl border border-border p-3 ${n.read ? "bg-card" : "bg-accent"}`}>
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
                      {(from?.displayName ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString("uk-UA")}
                        {n.amount != null && ` · ${formatUAH(n.amount)}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {notifs.length > 0 && (
              <button
                onClick={() => user && localNotifService.clear(user.id)}
                className="w-full text-xs text-muted-foreground hover:text-destructive py-2"
              >
                Очистити
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <button
        onClick={() => navigate({ to: "/profile" })}
        aria-label={t("profile.title")}
        className="size-9 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shadow-glow"
      >
        {initial}
      </button>
    </div>
  );
}
