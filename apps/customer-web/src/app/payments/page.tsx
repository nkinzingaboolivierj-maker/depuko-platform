"use client";
/** Payments: initiate (idempotent), watch status, request refunds. The UI
 * NEVER shows success unless the backend status says so - with no PSP the
 * API honestly reports the disabled/disabled-pending state. */
import { useState } from "react";
import { commerce } from "../../lib/commerce-api";
import { ApiError } from "../../lib/api";

export default function Payments() {
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [intent, setIntent] = useState<{ intentId: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function initiate() {
    setError(null);
    try {
      const r = await commerce.payments.initiate(orderId, {
        amountCents: Math.round(Number(amount) * 100),
        idempotencyKey: "pay_" + orderId + "_" + Date.now(),
      });
      setIntent(r);
    } catch (e) {
      setError(e instanceof ApiError ? `Initiation failed (${e.status})` : "Network error");
    }
  }
  async function refresh() {
    if (!intent) return;
    try { setIntent({ ...intent, ...(await commerce.payments.status(intent.intentId)) }); }
    catch (e) { setError(e instanceof ApiError ? `Status failed (${e.status})` : "Network error"); }
  }
  async function refund() {
    if (!intent) return;
    try {
      const amountCents = Math.round(Number(amount) * 100);
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Enter a valid refund amount in RWF.");
      await commerce.payments.requestRefund(intent.intentId, amountCents, "Customer refund request");
    } catch (e) {
      setError(e instanceof ApiError ? `Refund request failed (${e.status}) - refunds are admin-authorized` : "Network error");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Payments</h1>
      <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
        <input placeholder="Order id" value={orderId} onChange={e => setOrderId(e.target.value)} style={{ padding: 12 }} aria-label="order id" />
        <input placeholder="Amount (RWF)" type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: 12 }} aria-label="amount" />
        <button onClick={initiate} disabled={!orderId || !amount}>Initiate payment</button>
      </div>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      {intent && (
        <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd" }}>
          <p>Intent {intent.intentId} - status: <strong>{intent.status}</strong></p>
          <button onClick={refresh}>Refresh status</button>
          <button onClick={refund} style={{ marginLeft: 8 }}>Request refund</button>
          <p style={{ color: "#777", fontSize: 14 }}>Payment success only ever reflects the provider-verified backend status.</p>
        </section>
      )}
    </main>
  );
}