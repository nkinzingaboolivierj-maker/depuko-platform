"use client";
/** Business service configuration (V7.4): publish/unpublish services with
 * pricing. Publishing hits the permission-gated backend endpoint
 * (services:publish for platform catalog; business-scoped publish for the
 * org catalog) - the UI never fabricates a published state. */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../../../lib/api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";

async function req<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new ApiError(res.status, b || res.statusText); }
  return res.json() as Promise<T>;
}

export default function BusinessServices() {
  const [organizations, setOrganizations] = useState<{ id: string; legal_name: string; role: string }[]>([]);
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<{ id: string; name: string }[] | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("depuko_session") : null;

  useEffect(() => {
    let active = true;
    api.organization.mine().then(({ organizations: mine }) => {
      if (!active) return;
      setOrganizations(mine);
      setOrgId(current => mine.some(org => org.id === current) ? current : mine[0]?.id ?? "");
    }).catch(e => { if (active) setMsg(e instanceof ApiError ? `Could not load organizations (${e.status})` : "Network error"); });
    return () => { active = false; };
  }, []);

  const loadCatalog = useCallback(async () => {
    if (!orgId) return;
    try { setCatalog((await req<{ services: { id: string; name: string }[] }>(`/organizations/${orgId}/services`, {}, token ?? undefined)).services); }
    catch (e) { setMsg(e instanceof ApiError ? `Catalog failed (${e.status})` : "Network error"); }
  }, [orgId, token]);

  useEffect(() => { if (orgId) void loadCatalog(); }, [orgId, loadCatalog]);

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
      {organizations.length > 1 ? <select value={orgId} onChange={e => setOrgId(e.target.value)} aria-label="Select organization" style={{ padding: 12, width: "100%", maxWidth: 420 }}>{organizations.map(org => <option key={org.id} value={org.id}>{org.legal_name} · {org.role}</option>)}</select> : organizations.length === 1 ? <p>{organizations[0].legal_name} · {organizations[0].role}</p> : <p>No organization found. <a href="/business">Open business workspace</a>.</p>}
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