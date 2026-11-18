"use client";
/** Customer disputes (V7.4): raise a dispute against an order and view it.
 * Resolutions are admin-gated human decisions - this page only READS state. */
import { useState } from "react";
import { ApiError } from "../../lib/api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("depuko_session") : null;
  const res = await fetch(BASE + path, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) } });
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new ApiError(res.status, b || res.statusText); }
  return res.json() as Promise<T>;
}

export default function Disputes() {
  const [orderRef, setOrderRef] = useState("");
  const [against, setAgainst] = useState("");
  const [category, setCategory] = useState("quality");
  const [dispute, setDispute] = useState<{ disputeId: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function raise() {
    setError(null);
    try {
      setDispute(await req<{ disputeId: string; status: string }>("/disputes", {
        method: "POST", body: JSON.stringify({ orderRef, against, category }),
      }));
    } catch (e) {
      setError(e instanceof ApiError ? `Failed (${e.status})` : "Network error");
    }
  }

  async function hold() {
    if (!dispute) return;
    try {
      await req(`/disputes/${dispute.disputeId}/payout-hold`, { method: "POST" });
      setDispute({ ...dispute, status: "payout held during investigation" });
    } catch (e) {
      setError(e instanceof ApiError ? `Hold failed (${e.status})` : "Network error");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Disputes</h1>
      <div style={{ display: "grid", gap: 8, maxWidth: 400 }}>
        <input placeholder="Order id" value={orderRef} onChange={e => setOrderRef(e.target.value)} style={{ padding: 12 }} aria-label="order id" />
        <input placeholder="Counterparty user id" value={against} onChange={e => setAgainst(e.target.value)} style={{ padding: 12 }} aria-label="against" />
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="category">
          <option value="quality">Quality</option><option value="timeliness">Timeliness</option><option value="safety">Safety</option>
        </select>
        <button onClick={raise} disabled={!orderRef || !against}>Raise dispute</button>
      </div>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      {dispute && (
        <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd" }}>
          <p>Dispute {dispute.disputeId} - <strong>{dispute.status}</strong></p>
          <button onClick={hold}>Request payout hold</button>
          <p style={{ color: "#777", fontSize: 14 }}>Resolution is a human admin decision; refunds require admin authorization.</p>
        </section>
      )}
    </main>
  );
}