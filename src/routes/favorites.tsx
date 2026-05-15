import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { usePublicUsers } from "@/hooks/usePublicUsers";
import { Heart, Star } from "lucide-react";
import { FavoriteToggle } from "@/components/FavoriteToggle";

export const Route = createFileRoute("/favorites")({ head: () => ({ meta: [{ title: "Обране — Оплата та Поділ" }] }), component: FavoritesPage });

function FavoritesPage() {
  const { user, removeContact } = useAuth();
  const { groups } = useApp();
  const navigate = useNavigate();
  const favGroups = groups.filter((g) => (user?.favoriteGroups ?? []).includes(g.id));
  const contactProfiles = usePublicUsers(user?.contacts ?? []);
  const contacts = (user?.contacts ?? []).map((id) => contactProfiles[id]).filter(Boolean);

  return <MobileShell><header className="px-5 pt-6 pb-4"><h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="size-5 text-primary" /> Обране</h1><p className="text-sm text-muted-foreground">Улюблені групи та контакти</p></header><section className="px-5"><h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Star className="size-4 text-yellow-400 fill-yellow-400" /> Обрані групи</h2>{favGroups.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Немає обраних. Натисніть ⭐ на групі, щоб додати.</p> : <div className="space-y-2">{favGroups.map((g) => <div key={g.id} className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 shadow-card"><Link to="/groups/$groupId" params={{ groupId: g.id }} className="flex items-center gap-3 flex-1 min-w-0"><div className="size-12 rounded-xl bg-accent flex items-center justify-center text-2xl">{g.emoji}</div><div className="min-w-0"><p className="font-semibold truncate">{g.name}</p><p className="text-xs text-muted-foreground">{g.members.length} учасників</p></div></Link><FavoriteToggle groupId={g.id} /></div>)}</div>}</section><section className="px-5 mt-6"><div className="flex items-center justify-between mb-2"><h2 className="text-sm font-semibold">Контакти</h2><button onClick={() => navigate({ to: "/contacts" })} className="text-xs text-primary">Усі</button></div>{contacts.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Поки немає контактів. <Link to="/contacts" className="text-primary">Знайти</Link></p> : <div className="space-y-2">{contacts.slice(0, 6).map((c) => <div key={c.id} className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3"><div className="size-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">{c.displayName.slice(0, 1).toUpperCase()}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.displayName}</p><p className="text-xs text-muted-foreground truncate">@{c.username}</p></div><button onClick={() => removeContact(c.id)} className="text-xs text-muted-foreground hover:text-destructive">Прибрати</button></div>)}</div>}</section></MobileShell>;
}
