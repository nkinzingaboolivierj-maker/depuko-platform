"use client";
/** Business service configuration (V7.4): publish/unpublish services with
 * pricing. Publishing hits the permission-gated backend endpoint
 * (services:publish for platform catalog; business-scoped publish for the
 * org catalog) - the UI never fabricates a published state. */
import { useState } from "react";
import { ApiError } from "../../../lib/api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function req<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new ApiError(res.status, b || res.statusText); }
  return res.json() as Promise<T>;
}

export default function BusinessServices() {
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<{ id: string; name: string }[] | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("depuko_session") : null;

  async function loadCatalog() {
    if (!orgId) return;
    try { setCatalog((await req<{ services: { id: string; name: string }[] }>(`/organizations/${orgId}/services`, {}, token ?? undefined)).services); }
    catch (e) { setMsg(e instanceof ApiError ? `Catalog failed (${e.status})` : "Network error"); }
  }

  async function addService() {
    setMsg(null);
    try {
      await req(`/organizations/${orgId}/services`, {
        method: "POST",
        body: JSON.stringify({ name, priceCents: Math.round(Number(price) * 100) }),
      }, token ?? undefined);
      setMsg(`Service "${name}" saved as a draft. It is not published until an authorized review/publish process completes.`);
      setName(""); setPrice("");
      await loadCatalog();
    } catch (e) {
      setMsg(e instanceof ApiError ? `Failed (${e.status}) - check your business role` : "Network error");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Business - Services</h1>
      <input placeholder="Organization id" value={orgId} onChange={e => { setOrgId(e.target.value); }} style={{ padding: 12, width: 320 }} aria-label="org id" />
      <button onClick={loadCatalog} style={{ marginLeft: 8 }}>Load catalog</button>
      <div style={{ display: "grid", gap: 8, maxWidth: 360, marginTop: 16 }}>
        <input placeholder="Service name (e.g. Home cleaning - 5h)" value={name} onChange={e => setName(e.target.value)} style={{ padding: 12 }} aria-label="service name" />
        <input placeholder="Price (RWF)" type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ padding: 12 }} aria-label="price" />
        <button onClick={addService} disabled={!orgId || !name || !price}>Add service</button>
      </div>
      {msg && <p role="status">{msg}</p>}
      {catalog && (
        <ul style={{ marginTop: 16 }}>{catalog.map(s => <li key={s.id}>{s.id} - {s.name}</li>)}</ul>
      )}
    </main>
  );
}