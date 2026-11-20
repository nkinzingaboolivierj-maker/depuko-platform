"use client";
/** Customer and worker self-registration. Admin is never a public option. */
import { useState } from "react";
import { useSession } from "../../lib/session";
import Link from "next/link";

export default function Register() {
  const { register, error } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"customer" | "worker">("customer");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOk(await register(email, password, accountType));
    setBusy(false);
  }

  return (
    <main className="auth-page"><section className="auth-card"><a className="workspace-brand" href="/"><span>D</span> DEPUKO</a><div className="auth-kicker">GET STARTED</div>
      <h1>Create account</h1><p className="auth-description">Choose how you will use DEPUKO. Business owners can create an organization after signing in.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="account-type">Account type</label>
        <select id="account-type" value={accountType} onChange={e => setAccountType(e.target.value as "customer" | "worker")} className="auth-input">
          <option value="customer">Customer — hire services</option>
          <option value="worker">Worker — offer your skills</option>
        </select>
        <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="auth-input" aria-label="email" />
        <input type="password" required minLength={8} placeholder="Password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} className="auth-input" aria-label="password" />
        <button disabled={busy} type="submit" className="auth-submit">{busy ? "Creating..." : "Create account"}</button>
      </form>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      {ok && <p>Account created. Continue to your workspace.</p>}
      <p style={{ marginTop: 16 }}>Already registered? <Link href="/login">Sign in</Link>.</p>
    </section></main>
  );
}