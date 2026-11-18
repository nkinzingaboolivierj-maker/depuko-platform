"use client";
/** Contracts list + detail + acceptance (party-scoped: the API returns only
 * contracts you are a party to - non-party = honest 404). */
import { useEffect, useState } from "react";
import { commerce } from "../../lib/commerce-api";
import { ApiError } from "../../lib/api";

export default function Contracts() {
  const [contracts, setContracts] = useState<{ id: string; status: string; version: number }[] | null>(null);
  const [detail, setDetail] = useState<{ id: string; status: string; terms: Record<string, unknown>; signatures: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    commerce.contracts.mine()
      .then(r => setContracts(r.contracts))
      .catch(e => setError(e instanceof ApiError ? `Failed (${e.status})` : "Network error"));
  }, []);

  async function open(id: string) {
    try { setDetail(await commerce.contracts.detail(id)); }
    catch (e) { setError(e instanceof ApiError ? `Failed (${e.status})` : "Network error"); }
  }
  async function accept(id: string) {
    try { await commerce.contracts.accept(id); await open(id); }
    catch (e) { setError(e instanceof ApiError ? `Accept failed (${e.status})` : "Network error"); }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Contracts</h1>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      <ul>
        {contracts?.map(c => (
          <li key={c.id} style={{ display: "flex", gap: 12, padding: 8 }}>
            <span>{c.id} v{c.version} - {c.status}</span>
            <button onClick={() => open(c.id)}>View</button>
          </li>
        ))}
      </ul>
      {detail && (
        <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd" }}>
          <h2>{detail.id} - {detail.status}</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(detail.terms, null, 2)}</pre>
          <p>Signatures: {detail.signatures}</p>
          {detail.status === "sent" && <button onClick={() => accept(detail.id)}>Accept & sign</button>}
        </section>
      )}
    </main>
  );
}