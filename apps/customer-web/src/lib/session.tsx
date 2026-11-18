"use client";
/** Session context: opaque bearer token stored locally, used by the shared
 * API client. Real register/login calls only - no fake sessions. */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api, ApiError } from "./api";

interface SessionValue {
  token: string | null;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("depuko_session"),
  );
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const r = await api.login({ email, password });
      if (!r.sessionToken) throw new Error("no session token returned");
      localStorage.setItem("depuko_session", r.sessionToken);
      setToken(r.sessionToken);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? `Sign in failed (${e.status})` : "Network error");
      return false;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const r = await api.register({ email, password });
      if (!r.sessionToken) throw new Error("verify your email to activate the account");
      localStorage.setItem("depuko_session", r.sessionToken);
      setToken(r.sessionToken);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? `Registration failed (${e.status})` : "Network error");
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("depuko_session");
    setToken(null);
  }, []);

  const value = useMemo(() => ({ token, error, login, register, logout }), [token, error, login, register, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession requires SessionProvider");
  return ctx;
}