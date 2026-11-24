"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { API_BASE_URL, createApiClient } from "@/lib/api";
import { createAuthSession, type AuthSnapshot } from "@/lib/auth-session";

type AuthContext = AuthSnapshot &
  Pick<
    ReturnType<typeof createAuthSession>,
    "login" | "logout" | "request" | "restore"
  >;
const Context = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() =>
    createAuthSession(
      createApiClient(API_BASE_URL),
      () => window.sessionStorage,
    ),
  );
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getServerSnapshot,
  );

  useEffect(() => {
    void session.restore();
    const recheck = () => {
      if (document.visibilityState === "visible") void session.recheck();
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
      session.dispose();
    };
  }, [session]);

  const value = useMemo(
    () => ({
      ...snapshot,
      login: session.login,
      logout: session.logout,
      request: session.request,
      restore: session.restore,
    }),
    [snapshot, session],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
