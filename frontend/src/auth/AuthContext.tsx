import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api";
import { setUnauthorizedHandler, tokenStore } from "../api/client";
import type { Role, User } from "../types";

interface AuthValue {
  user: User | null;
  checking: boolean; // true while we verify a saved token on first load
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): void;
  hasRole(...roles: Role[]): boolean;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(!!tokenStore.get());

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout); // any 401 from the API signs the user out
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then(setUser).catch(() => tokenStore.clear()).finally(() => setChecking(false));
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    checking,
    async login(email, password) {
      const res = await api.login(email, password);
      tokenStore.set(res.token);
      setUser(res.user);
    },
    async register(name, email, password) {
      const res = await api.register(name, email, password);
      tokenStore.set(res.token);
      setUser(res.user);
    },
    logout,
    hasRole: (...roles) => !!user && roles.includes(user.role),
  }), [user, checking, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
