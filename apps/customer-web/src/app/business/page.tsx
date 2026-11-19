"use client";
/**
 * BUSINESS WORKSPACE (V7.2 directive 3B). Configuration-driven: the module
 * list is fetched from GET /organizations/:id/workspace - the SAME endpoint
 * that assembles modules from the business template + the user's role. A
 * cleaning company, restaurant, construction, film or transport business
 * each get their own module set with ZERO per-type frontend pages; a new
 * business type created through the Builder works here with no code change.
 * Sensitive modules (finance) only appear for owner/admin/finance roles. */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";

export default function BusinessWorkspace() {
  const [orgId, setOrgId] = useState("");
  const [modules, setModules] = useState<string[] | null>(null);
  const [onboarding, setOnboarding] = useState<{ status: string; progress: number; missingRequired: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async (id: string) => {
    setError(null);
    try {
      const r = await api.organization.workspace(id);
      setModules(r.modules);
    } catch (e) {
      setError(e instanceof ApiError ? `Workspace unavailable (${e.status})` : "Network error");
    }
  }, []);

  const loadOnboarding = useCallback(async (id: string) => {
    try {
      const r = await api.business.onboarding(id);
      setOnboarding({ status: r.status, progress: r.progress, missingRequired: r.missingRequired });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setOnboarding(null);
    }
  }, []);

  useEffect(() => { if (orgId) { loadWorkspace(orgId); loadOnboarding(orgId); } }, [orgId, loadWorkspace, loadOnboarding]);

  async function addBranch(name: string, region: string) {
    try {
      await api.organization.addBranch(orgId, name, region);
      await loadOnboarding(orgId);
    } catch (e) {
      setError(e instanceof ApiError ? `Branch failed (${e.status})` : "Network error");
    }
  }

  return (
    <main className="workspace-page">
      <header className="workspace-header"><a className="workspace-brand" href="/"><span>D</span> DEPUKO</a><nav><a href="/business">Workspace</a><a href="/business/orders">Orders</a><a href="/business/services">Services</a><a href="/business/staff">Staff</a></nav><a className="workspace-logout" href="/login">Sign in</a></header>
      <section className="workspace-heading"><span className="workspace-kicker">BUSINESS OPERATIONS</span><h1>Business workspace</h1><p>Manage your organization, services and daily operations.</p></section>
      <section className="workspace-card"><h2>Organization access</h2><p>Enter your organization ID to load the modules assigned to your business role.</p>
      <input placeholder="Your organization id" value={orgId} onChange={e => setOrgId(e.target.value)} className="workspace-input" aria-label="organization id" />
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      {onboarding && (
        <section className="workspace-card workspace-section">
          <h2>Onboarding</h2>
          <p>Status: {onboarding.status} - progress {Math.round(onboarding.progress)}%</p>
          {onboarding.missingRequired.length > 0 && (
            <p>Still needed: {onboarding.missingRequired.join(", ")}</p>
          )}
          <button onClick={() => api.business.submit(orgId).catch(e => setError(e instanceof ApiError ? `Submit failed (${e.status})` : "Network error"))}>Submit for verification</button>
        </section>
      )}
      {modules && (
        <section className="workspace-card workspace-section">
          <h2>Your modules (from the business configuration)</h2>
          <ul>{modules.map(m => <li key={m}>{m}</li>)}</ul>
        </section>
      )}
      {modules && modules.includes("branches") && (
        <section style={{ marginTop: 16 }}>
          <h2>Add branch</h2>
          <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); addBranch(String(f.get("name")), String(f.get("region"))); }}>
            <input name="name" required placeholder="Branch name" className="workspace-input" aria-label="branch name" />
            <input name="region" required placeholder="Region" className="workspace-input" aria-label="region" />
            <button type="submit">Add branch</button>
          </form>
        </section>
      )}
      </section>
    </main>
  );
}