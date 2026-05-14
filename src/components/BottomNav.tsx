import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Users, Plus, Heart, Home } from "lucide-react";
import { AddExpenseDialog } from "./AddExpenseDialog";

export function BottomNav() {
  const loc = useLocation();
  const router = useRouter();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 px-4 pb-4 pointer-events-none">
      <nav className="pointer-events-auto bg-surface-elevated/90 backdrop-blur-xl border border-border rounded-3xl shadow-card flex items-center justify-around px-2 py-2">
        <button
          onClick={() => router.history.back()}
          aria-label="Назад"
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-muted-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
        <Link
          to="/contacts"
          aria-label="Контакти"
          className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition ${
            loc.pathname.startsWith("/contacts") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Users className="size-5" />
        </Link>

        <AddExpenseDialog
          trigger={
            <button
              aria-label="Додати витрату"
              className="-mt-6 size-14 rounded-full gradient-primary shadow-glow flex items-center justify-center text-primary-foreground"
            >
              <Plus className="size-6" />
            </button>
          }
        />

        <Link
          to="/favorites"
          aria-label="Обране"
          className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition ${
            loc.pathname === "/favorites" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Heart className="size-5" />
        </Link>
        <Link
          to="/"
          aria-label="Головна"
          className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition ${
            loc.pathname === "/" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Home className="size-5" />
        </Link>
      </nav>
    </div>
  );
}
