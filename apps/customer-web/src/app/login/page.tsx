"use client";
/** Real login: POST /auth/login, store the session token. Honest errors. */
import { useState } from "react";
import { useSession } from "../../lib/session";
import Link from "next/link";

export default function Login() {
  const { login, error } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const success = await login(email, password);
    setOk(success);
    setBusy(false);
  }

  return (
    <main className="auth-page"><section className="auth-card"><a className="workspace-brand" href="/"><span>D</span> DEPUKO</a><div className="auth-kicker">WELCOME BACK</div>
      <h1>Sign in</h1><p className="auth-description">Continue to your DEPUKO workspace.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="auth-input" aria-label="email" />
        <input type="password" required minLength={8} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="auth-input" aria-label="password" />
        <button disabled={busy} type="submit" className="auth-submit">{busy ? "Signing in..." : "Sign in"}</button>
      </form>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      {ok && <p style={{ color: "#070" }}>Signed in. <Link href="/">Continue</Link></p>}
      <p style={{ marginTop: 16 }}>No account? <Link href="/register">Create one</Link>.</p>
</section></main>
  );
}