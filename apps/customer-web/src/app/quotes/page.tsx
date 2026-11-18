"use client";
/** Quotes list + acceptance. Accepting a quote moves it to accepted on the
 * BACKEND - the UI only reflects what the API returns. */
import { useEffect, useState } from "react";
import { commerce } from "../../lib/commerce-api";
import { ApiError } from "../../lib/api";

export default function Quotes() {
  const [quotes, setQuotes] = useState<{ id: string; status: string; totalCents: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setQuotes((await commerce.quotes.mine()).quotes); }
    catch (e) { setError(e instanceof ApiError ? `Failed (${e.status})` : "Network error"); }
  }
  useEffect(() => { load(); }, []);

  async function accept(id: string) {
    try { await commerce.quotes.accept(id); await load(); }
    catch (e) { setError(e instanceof ApiError ? `Accept failed (${e.status})` : "Network error"); }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Quotes</h1>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      {!quotes && !error && <p>Loading...</p>}
      {quotes?.length === 0 && <p>No quotes yet.</p>}
      <ul>
        {quotes?.map(q => (
          <li key={q.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 8 }}>
            <span>{q.id}</span><span>{q.status}</span><span>{(q.totalCents / 100).toLocaleString()} RWF</span>
            {q.status === "sent" && <button onClick={() => accept(q.id)}>Accept</button>}
          </li>
        ))}
      </ul>
    </main>
  );
}