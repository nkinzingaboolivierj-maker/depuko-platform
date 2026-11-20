"use client";
import Link from "next/link";
import { useState } from "react";
import { useAdminSession } from "../components/AdminSessionProvider";
import { adminApi } from "../lib/api";

export default function Admin() {
  const { token, logout } = useAdminSession();
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function load() {
    setLoading(true);
    const messages: string[] = [];
    try {
      const balance = await adminApi.balanceCheck(token);
      messages.push(balance.healthy
        ? `Finance integrity healthy — ${balance.checked} transactions checked`
        : "Finance imbalance detected — review required");
    } catch { messages.push("Finance check unavailable — verify finance:read permission"); }
    try {
      const integrations = await adminApi.integrationHealth(token);
      integrations.forEach(item => messages.push(`Integration ${item.kind}/${item.provider}: ${item.enabled ? "enabled" : "disabled"}`));
    } catch { messages.push("Integration registry unavailable — verify integrations:manage permission"); }
    setStatus(messages);
    setLoading(false);
  }

  return <div className={"admin-shell" + (sidebarOpen ? "" : " sidebar-collapsed")}>
    <aside className="admin-sidebar">
      <a href="/" className="admin-brand"><span className="admin-brand-mark">D</span> DEPUKO</a>
      <div className="admin-workspace-label">Workspace</div>
      <nav className="admin-nav">
        <a aria-current="page" href="/">Overview</a>
        <a href="/command-center">Command center</a>
        <a href="/operations">Operations</a>
        <a href="https://depuko-platform-mainnn.vercel.app">Customer platform</a>
      </nav>
      <div className="admin-sidebar-foot">DEPUKO CONTROL PLANE<br/>Sensitive actions require authorization and human review.</div>
    </aside>
    <main className="admin-main">
      <div className="admin-topbar">
        <button className="sidebar-toggle" type="button" onClick={() => setSidebarOpen(value => !value)} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarOpen}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
        <span className="admin-breadcrumb">Workspace / Overview</span>
        <button className="admin-signout" onClick={logout}>Sign out</button>
      </div>
      <header className="admin-heading"><span className="admin-kicker">ADMINISTRATION</span><h1>Attention center</h1><p>Operational visibility for the DEPUKO platform.</p></header>
      <div className="admin-notice">Only measured system responses are displayed. Unavailable modules are not represented by sample metrics.</div>
      <section className="admin-section admin-grid">
        <Link className="admin-card admin-link-card" href="/command-center"><div><strong>Command center</strong><span>System health, integrations, finance checks and trust actions.</span></div><b className="admin-link-arrow">Open</b></Link>
        <Link className="admin-card admin-link-card" href="/operations"><div><strong>Operations</strong><span>Measured order analytics and operational controls.</span></div><b className="admin-link-arrow">Open</b></Link>
      </section>
      <section className="admin-section admin-card">
        <h2>Quick system checks</h2><p>Run permission-gated checks using your verified administrator session.</p>
        <div className="admin-form-row"><button disabled={loading} onClick={load}>{loading ? "Checking…" : "Run checks"}</button></div>
        {status.length > 0 && <ul>{status.map((message, index) => <li key={index}>{message}</li>)}</ul>}
      </section>
      <section className="admin-section admin-grid three">
        <article className="admin-card"><h2>People & trust</h2><p>Worker verification and account restrictions require human review.</p></article>
        <article className="admin-card"><h2>Money</h2><p>Real-money payment flows remain disabled pending webhook and ledger verification.</p></article>
        <article className="admin-card"><h2>Payroll</h2><p>Unavailable until reviewed country-specific rules are configured.</p></article>
      </section>
    </main>
  </div>;
}