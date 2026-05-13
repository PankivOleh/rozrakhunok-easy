import { useState, type ReactNode } from "react";
import { Bell, Check, Globe, Moon, Sun } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";

export function HeaderActions({ children }: { children?: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);

  const initial = (user?.displayName ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="flex items-center gap-1">
      {children}

      {/* Language */}
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
              className="w-full flex items-center justify-between px-2 py-2 rounded-md text-sm hover:bg-accent"
            >
              <span>{l === "uk" ? "Українська" : "English"}</span>
              {lang === l && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Theme */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="size-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
      >
        {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </button>

      {/* Notifications */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            aria-label={t("notif.title")}
            className="size-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          >
            <Bell className="size-4" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[88%] sm:w-96">
          <SheetHeader>
            <SheetTitle>{t("notif.title")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 text-sm text-muted-foreground text-center py-12">
            {t("notif.empty")}
          </div>
        </SheetContent>
      </Sheet>

      {/* Profile */}
      <button
        onClick={() => navigate({ to: "/profile" })}
        aria-label={t("profile.title")}
        className="ml-1 size-9 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground"
      >
        {initial}
      </button>
    </div>
  );
}
