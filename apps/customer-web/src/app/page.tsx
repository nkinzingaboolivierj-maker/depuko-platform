"use client";
/**
 * Customer home - THE required entry point: "What do you need done?"
 * A real API call searches published services by capability. Results are
 * only rendered from the actual backend response - never mocked.
 */
import { useState } from "react";
import { api, ApiError } from "../lib/api";

export default function Home() {
  const [need, setNeed] = useState("");
  const [results, setResults] = useState<{ id: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true); setError(null); setResults(null);
    try {
      const found = await api.searchServices(need.trim());
      setResults(found);
    } catch (e) {
      setError(e instanceof ApiError ? `Search failed (${e.status})` : "Network error - cannot reach the DEPUKO API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1rem", fontFamily: "system-ui" }}>
      <h1>What do you need done?</h1>
      <p style={{ color: "#555" }}>Describe it in your own words - Kinyarwanda, English or French.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={need}
          onChange={e => setNeed(e.target.value)}
          placeholder="Nshaka umuntu uza mu rugo kumogosha imbwa..."
          style={{ flex: 1, padding: 12, fontSize: 16 }}
          aria-label="What do you need done?"
        />
        <button onClick={search} disabled={loading || !need.trim()} style={{ padding: "12px 20px", fontSize: 16 }}>
          {loading ? "Searching..." : "Find providers"}
        </button>
      </div>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      {results && (
        results.length === 0
          ? <p>No published services match that yet. Try different words, or the capability is not available.</p>
          : <ul>{results.map(r => <li key={r.id}>Service {r.id}</li>)}</ul>
      )}
    </main>
  );
}