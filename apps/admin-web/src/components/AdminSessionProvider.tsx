"use client";

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";
type AdminSession = { token: string; logout: () => void };
const SessionContext = createContext<AdminSession>({ token: "", logout: () => {} });

async function assertAdmin(token: string) {
  const response = await fetch(API + "/finance/balance-check", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("This account does not have administrator access.");
  }
  if (!response.ok) throw new Error("Could not verify administrator access. Please try again.");
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const saved = window.sessionStorage.getItem("depuko-admin-session");
    if (!saved) { setBusy(false); return; }
    assertAdmin(saved).then(() => {
      if (active) setToken(saved);
    }).catch(() => {
      window.sessionStorage.removeItem("depuko-admin-session");
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(API + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "Sign in failed. Check your credentials.");
      const sessionToken = payload.sessionToken ?? payload.token;
      if (typeof sessionToken !== "string" || !sessionToken) throw new Error("The API did not return a valid session.");
      await assertAdmin(sessionToken);
      window.sessionStorage.setItem("depuko-admin-session", sessionToken);
      setToken(sessionToken);
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    window.sessionStorage.removeItem("depuko-admin-session");
    setToken("");
    setPassword("");
  }

  if (busy && !token) return <main className="admin-login-page"><section className="admin-login-card"><strong>DEPUKO</strong><p>Verifying secure administrator session…</p></section></main>;
  if (!token) return <main className="admin-login-page"><section className="admin-login-card">
    <span className="admin-kicker">SECURE ADMINISTRATION</span><h1>Sign in to DEPUKO</h1>
    <p>Use your administrator account. Access is verified by the API before the control panel opens.</p>
    <form onSubmit={login}>
      <label htmlFor="admin-email">Email address</label>
      <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="admin@example.com" />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Your password" />
      {error && <p className="admin-login-error" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Verifying…" : "Sign in securely"}</button>
    </form>
  </section></main>;

  return <SessionContext.Provider value={{ token, logout }}>{children}</SessionContext.Provider>;
}

export function useAdminSession() {
  return useContext(SessionContext);
}
