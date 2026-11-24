"use client";
import { useState } from "react";
import { useAdminSession } from "../../components/AdminSessionProvider";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";
async function call(path: string, token: string, method: string, body?: unknown) {
  const response = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`(${response.status}) ${await response.text().catch(() => "")}`.slice(0, 200));
  return response.json();
}

export default function CommandCenter() {
  const { token, logout } = useAdminSession();
  const [log, setLog] = useState<string[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [disputeId, setDisputeId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [caseId, setCaseId] = useState("");
  const [reason, setReason] = useState("");

  const note = (message: string) => setLog(items => [message, ...items]);
  async function run(name: string, action: () => Promise<unknown>) {
    try { note(name + ": OK — " + JSON.stringify(await action()).slice(0, 160)); }
    catch (error) { note(name + ": FAILED — " + (error as Error).message); }
  }

  return <div className="admin-shell">
    <aside className="admin-sidebar"><a href="/" className="admin-brand"><span className="admin-brand-mark">D</span> DEPUKO</a><div className="admin-workspace-label">Workspace</div><nav className="admin-nav"><a href="/">Overview</a><a aria-current="page" href="/command-center">Command center</a><a href="/operations">Operations</a></nav><div className="admin-sidebar-foot">Authorized access only.<br/>API permissions are enforced server-side.</div></aside>
    <main className="admin-main">
      <div className="admin-topbar"><span className="admin-breadcrumb">Workspace / Command center</span><button className="admin-signout" onClick={logout}>Sign out</button></div>
      <header className="admin-heading"><span className="admin-kicker">PLATFORM CONTROL</span><h1>Command center</h1><p>Run operational checks and authorized decisions.</p></header>
      <section className="admin-section"><h2 className="admin-section-title">Attention & system health</h2><div className="admin-card admin-form-row">
        <button onClick={() => run("Finance integrity", () => call("/finance/balance-check", token, "GET"))}>Check financial integrity</button>
        <button onClick={() => run("Integration health", () => call("/integrations/health", token, "GET"))}>Integration health</button>
        <button onClick={() => run("System health", () => call("/health", token, "GET"))}>System health</button>
      </div></section>
      <section className="admin-section"><h2 className="admin-section-title">Workforce verification</h2><div className="admin-card">
        <div className="admin-form-row"><input placeholder="Worker user ID" value={workerId} onChange={event => setWorkerId(event.target.value)}/><input placeholder="Reason (10+ characters)" value={reason} onChange={event => setReason(event.target.value)}/></div>
        <div className="admin-form-row" style={{marginTop:12}}><button disabled={!workerId || reason.trim().length < 10} onClick={() => run("Approve worker", () => call(`/workforce/workers/${workerId}/verify`, token, "POST", {approved:true,rationale:reason}))}>Approve verification</button><button disabled={!workerId || reason.trim().length < 10} onClick={() => run("Reject worker", () => call(`/workforce/workers/${workerId}/verify`, token, "POST", {approved:false,rationale:reason}))}>Reject with reason</button></div>
      </div></section>
      <section className="admin-section"><h2 className="admin-section-title">Disputes</h2><div className="admin-card">
        <div className="admin-form-row"><input placeholder="Dispute ID" value={disputeId} onChange={event => setDisputeId(event.target.value)}/><input placeholder="Resolution reason (10+ characters)" value={disputeReason} onChange={event => setDisputeReason(event.target.value)}/></div>
        <div className="admin-form-row" style={{marginTop:12}}><button disabled={!disputeId || disputeReason.trim().length < 10} onClick={() => run("Dismiss dispute", () => call(`/disputes/${disputeId}/resolve`, token, "POST", {kind:"dismissed",rationale:disputeReason}))}>Dismiss dispute</button><button disabled={!disputeId || disputeReason.trim().length < 10} onClick={() => run("Full refund", () => call(`/disputes/${disputeId}/resolve`, token, "POST", {kind:"full_refund",rationale:disputeReason}))}>Authorize full refund</button></div>
      </div></section>
      <section className="admin-section"><h2 className="admin-section-title">Trust & safety</h2><div className="admin-card admin-form-row"><input placeholder="Case ID" value={caseId} onChange={event => setCaseId(event.target.value)}/><button disabled={!caseId || reason.trim().length < 10} onClick={() => run("Restrict account", () => call(`/trust/cases/${caseId}/restrict`, token, "POST", {rationale:reason}))}>Restrict account</button></div></section>
      <section className="admin-section"><h2 className="admin-section-title">Operations log</h2><div className="admin-log">{log.length ? log.join("\\n") : "No actions run in this session yet."}</div></section>
      <p className="admin-notice admin-section">Payroll requires reviewed country rules. Real-money payment functionality must remain disabled until webhook capture persistence and idempotency are verified.</p>
    </main>
  </div>;
}