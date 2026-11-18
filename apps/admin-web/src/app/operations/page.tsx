"use client";
/** Admin operations (V7.3 section C): measured analytics, disputes and
 * verification surfaces. Every panel hits a permission-gated real endpoint;
 * panels that need owner-side configuration say so - no fabricated values. */
import { useState } from "react";
import { adminApi } from "../../lib/api";

export default function AdminOperations() {
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState<{ status: string; count: string }[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function loadAnalytics() {
    setNote(null);
    try { setOrders(await adminApi.analyticsOrders(token)); }
    catch { setNote("Analytics unavailable - requires admin session with analytics:read."); }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Admin - Operations</h1>
      <input placeholder="Admin session token" value={token} onChange={e => setToken(e.target.value)} style={{ padding: 12, width: 320 }} aria-label="session token" />
      <div style={{ margin: 12 }}><button onClick={loadAnalytics}>Load measured order analytics</button></div>
      {note && <p role="alert" style={{ color: "#b00" }}>{note}</p>}
      {orders && (
        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead><tr><th>status</th><th>count (measured)</th></tr></thead>
          <tbody>{orders.map((o, i) => <tr key={i}><td>{o.status}</td><td>{o.count}</td></tr>)}</tbody>
        </table>
      )}
      <ul style={{ marginTop: 24, color: "#555" }}>
        <li>Worker verification: POST /workforce/workers/:id/verify (workers:suspend permission) - console pending owner-run staging.</li>
        <li>Disputes: POST /disputes/:id/resolve (payments:refund permission) - human decision required.</li>
        <li>Trust restrictions: POST /trust/cases/:id/restrict (workers:suspend) - mandatory human rationale.</li>
        <li>Payroll: PAYROLL UNAVAILABLE until reviewed country rules are registered (by design).</li>
      </ul>
    </main>
  );
}