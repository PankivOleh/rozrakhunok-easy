import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService, type AppUser } from "@/services/authService";

export type AuthUser = AppUser;

type Ctx = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
  toggleFavorite: (groupId: string) => Promise<void>;
  addContact: (userId: string) => Promise<void>;
  removeContact: (userId: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const off = authService.onAuthChange(
      (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => { off(); };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      loading,
      error,
      signIn: async (email, password) => { await authService.signIn(email, password); },
      signUp: async (email, password, displayName, username) => {
        await authService.signUp(email, password, displayName, username);
      },
      signOut: async () => { await authService.signOut(); },
      deleteAccount: async () => {
        if (!user) return;
        await authService.deleteAccount(user.id);
      },
      updateUser: async (patch) => {
        if (!user) return;
        await authService.updateUser(user.id, patch);
      },
      toggleFavorite: async (groupId) => {
        if (!user) return;
        const favoriteGroups = user.favoriteGroups.includes(groupId)
          ? user.favoriteGroups.filter((id) => id !== groupId)
          : [...user.favoriteGroups, groupId];
        await authService.updateUser(user.id, { favoriteGroups });
      },
      addContact: async (userId) => {
        if (!user || userId === user.id || user.contacts.includes(userId)) return;
        await authService.updateUser(user.id, { contacts: [...user.contacts, userId] });
      },
      removeContact: async (userId) => {
        if (!user) return;
        await authService.updateUser(user.id, { contacts: user.contacts.filter((id) => id !== userId) });
      },
      sendPasswordReset: async (email) => { await authService.sendPasswordReset(email); },
      resendVerification: async () => { await authService.resendVerification(); },
      refreshAuth: async () => {
        await authService.reloadCurrent();
        // Trigger re-derivation by calling auth state subscribers — easiest: rely on profile snapshot
      },
    }),
    [user, loading, error],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
