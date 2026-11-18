"use client";
/**
 * ADMIN COMMAND CENTER (V7.4) - every section performs a REAL authorized call.
 * Sensitive actions (verify worker, resolve dispute, restrict account) hit
 * permission-gated endpoints; failures surface honestly. Panels needing
 * owner-side configuration say so - nothing is fabricated. */
import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function call(path: string, token: string, method: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`(${res.status}) ${await res.text().catch(() => "")}`.slice(0, 200));
  return res.json();
}

export default function CommandCenter() {
  const [token, setToken] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [disputeId, setDisputeId] = useState("");
  const [disputeRationale, setDisputeRationale] = useState("");
  const [caseId, setCaseId] = useState("");
  const [rationale, setRationale] = useState("");

  const note = (s: string) => setLog(l => [...l, s]);

  async function section(name: string, fn: () => Promise<unknown>) {
    try {
      const r = await fn();
      note(`${name}: OK - ${JSON.stringify(r).slice(0, 160)}`);
    } catch (e) {
      note(`${name}: FAILED - ${(e as Error).message}`);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>DEPUKO Command Center</h1>
      <input placeholder="Admin session token" value={token} onChange={e => setToken(e.target.value)} style={{ padding: 12, width: 360 }} aria-label="session token" />

      <h2 style={{ marginTop: 24 }}>Attention</h2>
      <button onClick={() => section("Finance integrity", () => call("/finance/balance-check", token, "GET"))}>Check financial integrity</button>
      <button onClick={() => section("Integration health", () => call("/integrations/health", token, "GET"))}>Integration health</button>
      <button onClick={() => section("System health", () => call("/health", token, "GET"))}>System health</button>

      <h2 style={{ marginTop: 24 }}>Workforce verification</h2>
      <input placeholder="Worker user id" value={workerId} onChange={e => setWorkerId(e.target.value)} style={{ padding: 12 }} aria-label="worker id" />
      <input placeholder="Verification rationale (10+ characters)" value={rationale} onChange={e => setRationale(e.target.value)} style={{ padding: 12, marginLeft: 8, width: 300 }} aria-label="worker verification rationale" />
      <button onClick={() => section("Verify worker", () => call(`/workforce/workers/${workerId}/verify`, token, "POST", { approved: true, rationale }))} disabled={!workerId || rationale.trim().length < 10}>Approve verification</button>
      <button onClick={() => section("Reject worker", () => call(`/workforce/workers/${workerId}/verify`, token, "POST", { approved: false, rationale }))} disabled={!workerId || rationale.trim().length < 10}>Reject with reason</button>

      <h2 style={{ marginTop: 24 }}>Disputes</h2>
      <input placeholder="Dispute id" value={disputeId} onChange={e => setDisputeId(e.target.value)} style={{ padding: 12 }} aria-label="dispute id" />
      <input placeholder="Resolution rationale (10+ characters)" value={disputeRationale} onChange={e => setDisputeRationale(e.target.value)} style={{ padding: 12, marginLeft: 8, width: 300 }} aria-label="dispute rationale" />
      <button onClick={() => section("Dismiss dispute", () => call(`/disputes/${disputeId}/resolve`, token, "POST", { kind: "dismissed", rationale: disputeRationale }))} disabled={!disputeId || disputeRationale.trim().length < 10}>Dismiss</button>
      <button onClick={() => section("Full refund", () => call(`/disputes/${disputeId}/resolve`, token, "POST", { kind: "full_refund", rationale: disputeRationale }))} disabled={!disputeId || disputeRationale.trim().length < 10}>Authorize full refund</button>

      <h2 style={{ marginTop: 24 }}>Trust & Safety</h2>
      <input placeholder="Case id" value={caseId} onChange={e => setCaseId(e.target.value)} style={{ padding: 12 }} aria-label="case id" />
      <input placeholder="Mandatory human rationale" value={rationale} onChange={e => setRationale(e.target.value)} style={{ padding: 12, marginLeft: 8, width: 280 }} aria-label="rationale" />
      <button
        onClick={() => section("Restrict account", () => call(`/trust/cases/${caseId}/restrict`, token, "POST", { rationale }))}
        disabled={!caseId || rationale.trim().length < 10}
      >Restrict (human decision required)</button>

      <h2 style={{ marginTop: 24 }}>Operations log</h2>
      <ul style={{ fontFamily: "monospace", fontSize: 13, background: "#f7f7f7", padding: 16 }}>
        {log.map((l, i) => <li key={i} style={{ listStyle: "none", padding: 4 }}>{l}</li>)}
      </ul>

      <p style={{ color: "#777", marginTop: 24, fontSize: 14 }}>
        Payroll console: PAYROLL UNAVAILABLE until you register reviewed country rules (by design).
        Analytics: measured aggregates only. Audit trail: append-only at the database level.
      </p>
    </main>
  );
}