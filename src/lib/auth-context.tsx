import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localAuthService, type LocalUser } from "@/services/localAuthService";

type Ctx = {
  user: LocalUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
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
      signUp: async (e, p, n) => { await localAuthService.signUp(e, p, n); },
      signOut: async () => { await localAuthService.signOut(); },
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
