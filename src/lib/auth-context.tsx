import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localAuthService, type LocalUser } from "@/services/localAuthService";

type Ctx = {
  user: LocalUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<LocalUser>) => Promise<void>;
  toggleFavorite: (groupId: string) => Promise<void>;
  addContact: (userId: string) => Promise<void>;
  removeContact: (userId: string) => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const off = localAuthService.onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => { off(); };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      loading,
      signIn: async (e, p) => { await localAuthService.signIn(e, p); },
      signUp: async (e, p, n, un) => { await localAuthService.signUp(e, p, n, un); },
      signOut: async () => { await localAuthService.signOut(); },
      updateUser: async (patch) => {
        if (!user) return;
        await localAuthService.updateUser(user.id, patch);
      },
      toggleFavorite: async (groupId) => {
        if (!user) return;
        const fav = user.favoriteGroups ?? [];
        const next = fav.includes(groupId) ? fav.filter((x) => x !== groupId) : [...fav, groupId];
        await localAuthService.updateUser(user.id, { favoriteGroups: next });
      },
      addContact: async (userId) => {
        if (!user || userId === user.id) return;
        const cs = user.contacts ?? [];
        if (cs.includes(userId)) return;
        await localAuthService.updateUser(user.id, { contacts: [...cs, userId] });
      },
      removeContact: async (userId) => {
        if (!user) return;
        await localAuthService.updateUser(user.id, {
          contacts: (user.contacts ?? []).filter((x) => x !== userId),
        });
      },
    }),
    [user, loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
