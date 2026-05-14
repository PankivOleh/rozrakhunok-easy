/**
 * Local in-app notifications. Mirrors a Firestore `notifications` collection.
 * Mock listener pattern equivalent to onSnapshot.
 */
export type Notification = {
  id: string;
  toUserId: string;
  fromUserId: string;
  groupId?: string;
  type: "remind" | "settle" | "expense";
  message: string;
  amount?: number;
  read: boolean;
  createdAt: string;
};

const KEY = "ps_notifications_v1";

function read(): Notification[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(arr: Notification[]) {
  localStorage.setItem(KEY, JSON.stringify(arr));
  emit();
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === KEY) emit(); });
}

export const localNotifService = {
  list(uid: string): Notification[] {
    return read().filter((n) => n.toUserId === uid).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  unreadCount(uid: string): number {
    return read().filter((n) => n.toUserId === uid && !n.read).length;
  },
  add(n: Omit<Notification, "id" | "createdAt" | "read">) {
    const all = read();
    all.push({ ...n, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString(), read: false });
    write(all);
  },
  markAllRead(uid: string) {
    const all = read().map((n) => (n.toUserId === uid ? { ...n, read: true } : n));
    write(all);
  },
  clear(uid: string) {
    write(read().filter((n) => n.toUserId !== uid));
  },
  subscribe(cb: () => void) {
    listeners.add(cb);
    cb();
    return () => listeners.delete(cb);
  },
};
