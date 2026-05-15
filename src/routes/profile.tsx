import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, AtSign, LogOut, Mail, Trash2, User as UserIcon } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ head: () => ({ meta: [{ title: "Профіль — Оплата та Поділ" }] }), component: ProfilePage });

function ProfilePage() {
  const { user, signOut, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await signOut(); toast.success("Ви вийшли"); navigate({ to: "/login" }); };
  const handleDelete = async () => { if (!user || !confirm("Видалити акаунт і всі дані?")) return; try { await deleteAccount(); toast.success("Акаунт видалено"); navigate({ to: "/register" }); } catch (err) { toast.error((err as Error).message); } };
  if (!user) return null;
  const initial = user.displayName.slice(0, 1).toUpperCase();
  return <MobileShell><header className="px-5 pt-6 pb-4 flex items-center gap-3"><button onClick={() => navigate({ to: "/" })} className="size-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center"><ArrowLeft className="size-4" /></button><h1 className="font-bold text-lg">Профіль</h1></header><section className="px-5"><div className="rounded-3xl gradient-card p-6 shadow-glow text-primary-foreground flex items-center gap-4"><div className="size-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">{initial}</div><div className="min-w-0"><p className="font-semibold text-lg truncate">{user.displayName}</p><p className="text-sm opacity-80 truncate">@{user.username}</p></div></div></section><section className="px-5 mt-5 space-y-2"><Row icon={<UserIcon className="size-4" />} label="Імʼя" value={user.displayName} /><Row icon={<AtSign className="size-4" />} label="Username" value={`@${user.username}`} /><Row icon={<Mail className="size-4" />} label="Email" value={user.email ?? "—"} /></section><section className="px-5 mt-6 space-y-2"><Button onClick={handleLogout} variant="outline" className="w-full h-12 rounded-xl"><LogOut className="size-4 mr-2" /> Вийти</Button><Button onClick={handleDelete} variant="ghost" className="w-full h-12 rounded-xl text-destructive hover:text-destructive"><Trash2 className="size-4 mr-2" /> Видалити акаунт</Button></section></MobileShell>;
}
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3"><div className="size-9 rounded-xl bg-accent flex items-center justify-center text-primary">{icon}</div><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium truncate">{value}</p></div></div>; }
