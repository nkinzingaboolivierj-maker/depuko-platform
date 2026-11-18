"use client";
/** Customer project view (V7.4): project services + readiness from the
 * projects API. Blocked/unblocked reflects the REAL dependency graph state. */
import { useState } from "react";
import { ApiError } from "../../lib/api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function Projects() {
  const [projectId, setProjectId] = useState("");
  const [services, setServices] = useState<{ serviceId: string; readiness: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("depuko_session") : null;

  async function load() {
    setError(null);
    try {
      const res = await fetch(`${BASE}/projects/${projectId}/services`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new ApiError(res.status, res.statusText);
      const r = await res.json() as { services: { serviceId: string }[] };
      const withReadiness = await Promise.all(r.services.map(async s => {
        const rr = await fetch(`${BASE}/projects/${projectId}/readiness/${s.serviceId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        return { serviceId: s.serviceId, readiness: rr.ok ? (await rr.json()).readiness : "unknown" };
      }));
      setServices(withReadiness);
    } catch (e) {
      setError(e instanceof ApiError ? `Failed (${e.status})` : "Network error");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Project</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="Project id" value={projectId} onChange={e => setProjectId(e.target.value)} style={{ padding: 12, flex: 1 }} aria-label="project id" />
        <button onClick={load} disabled={!projectId}>Load</button>
      </div>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      <ul style={{ marginTop: 16 }}>
        {services?.map(s => (
          <li key={s.serviceId} style={{ padding: 8 }}>
            {s.serviceId} - <strong style={{ color: s.readiness === "blocked" ? "#b00" : "#070" }}>{s.readiness}</strong>
          </li>
        ))}
      </ul>
      {services && services.length === 0 && <p>No services in this project yet.</p>}
    </main>
  );
}