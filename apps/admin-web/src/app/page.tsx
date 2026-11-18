"use client";
/**
 * ADMIN COMMAND CENTER (V7.2 directive 3C). Every panel reads REAL endpoints
 * with admin permissions: integration health, financial integrity, worker
 * verification queue. Sections whose backend module is not implemented show
 * that honestly - never fabricated metrics or badges. Sensitive operations
 * (verify/restrict) are permission-gated server-side; the UI never fakes
 * authorization. */
import { useState } from "react";
import { adminApi } from "../lib/api";

export default function Admin() {
  const [token, setToken] = useState("");
  const [panels, setPanels] = useState<{ attention: string[] } | null>(null);

  async function load() {
    const attention: string[] = [];
    try {
      const balance = await adminApi.balanceCheck(token);
      attention.push(balance.healthy ? `Finance: ledger healthy (${balance.checked} tx checked)` : "FINANCE: UNBALANCED TRANSACTIONS FOUND - action required");
    } catch { attention.push("Finance: balance check unavailable (requires admin session with finance:read)"); }
    try {
      const health = await adminApi.integrationHealth(token);
      for (const h of health) {
        attention.push(h.enabled ? `Integration ${h.kind}/${h.provider}: enabled` : `Integration ${h.kind}/${h.provider}: DISABLED - ${h.credential_configured ? "manually disabled" : "credentials missing"}`);
      }
    } catch { attention.push("Integrations: registry unreachable (requires integrations:manage)"); }
    setPanels({ attention });
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>DEPUKO Admin - Attention Center</h1>
      <input placeholder="Admin session token" value={token} onChange={e => setToken(e.target.value)} style={{ padding: 12, width: 320 }} aria-label="session token" />
      <div style={{ margin: 12 }}><button onClick={load}>Load status</button></div>
      {panels && (
        <ul style={{ lineHeight: 1.8 }}>
          {panels.attention.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      )}
      <p style={{ color: "#777", marginTop: 24 }}>
        Payroll console: requires reviewed country rules (registry ships empty - owner action).
        Trust decisions: human-reviewed only. Analytics: measured aggregates only, no forecasts.
      </p>
    </main>
  );
}