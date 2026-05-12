import { Link, useLocation } from "@tanstack/react-router";
import { ChevronLeft, List, Home, Heart, Search } from "lucide-react";

export function BottomNav() {
  const loc = useLocation();
  const items = [
    { icon: ChevronLeft, label: "Назад", to: "/" as const, isBack: true },
    { icon: List, label: "Список", to: "/groups" as const },
    { icon: Home, label: "Дім", to: "/" as const, accent: true },
    { icon: Heart, label: "Обране", to: "/favorites" as const },
    { icon: Search, label: "Пошук", to: "/search" as const },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 px-4 pb-4 pointer-events-none">
      <nav className="pointer-events-auto bg-surface-elevated/90 backdrop-blur-xl border border-border rounded-3xl shadow-card flex items-center justify-around px-2 py-2">
        {items.map((it, i) => {
          const Icon = it.icon;
          const active = !it.accent && loc.pathname === it.to && !it.isBack;
          if (it.accent) {
            return (
              <Link
                key={i}
                to={it.to}
                className="-mt-6 size-14 rounded-full gradient-primary shadow-glow flex items-center justify-center text-primary-foreground"
              >
                <Icon className="size-6" />
              </Link>
            );
          }
          return (
            <Link
              key={i}
              to={it.to}
              onClick={(e) => {
                if (it.isBack) {
                  e.preventDefault();
                  history.back();
                }
              }}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
