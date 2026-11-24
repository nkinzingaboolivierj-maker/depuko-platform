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
import { ThemeToggle } from "../../components/ThemeProvider";

export default function BusinessWorkspace() {
  const [orgId, setOrgId] = useState("");

  const [organizations, setOrganizations] = useState<{ id: string; legal_name: string; industry: string; status: string; role: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; label: string }[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("RW");
  const [industry, setIndustry] = useState("");
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
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

  useEffect(() => {
    let active = true;
    Promise.all([api.organization.mine(), api.business.templates()])
      .then(([mine, availableTemplates]) => {
        if (!active) return;
        setOrganizations(mine.organizations);
        setTemplates(availableTemplates);
        setTemplateId(availableTemplates[0]?.id ?? "");
        setOrgId(current => mine.organizations.some(org => org.id === current)
          ? current
          : mine.organizations[0]?.id ?? "");
      })
      .catch(e => {
        if (!active) return;
        setRequiresSignIn(e instanceof ApiError && e.status === 401);
        setError(e instanceof ApiError && e.status === 401
          ? "Please sign in to access your business workspace."
          : e instanceof ApiError
            ? `Could not load business profile (${e.status}).`
            : "Could not connect to DEPUKO.");
      })
      .finally(() => { if (active) setLoadingOrganizations(false); });
    return () => { active = false; };
  }, []);

  async function createBusiness(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingBusiness(true);
    setError(null);
    try {
      const result = await api.business.register({ templateId, legalName, country, industry });
      const created = { id: result.organizationId, legal_name: legalName, industry, status: result.status, role: "owner" };
      setOrganizations(current => [created, ...current]);
      setOrgId(result.organizationId);
    } catch (e) {
      setError(e instanceof ApiError ? `Business registration failed (${e.status}): ${e.message}` : "Network error");
    } finally {
      setCreatingBusiness(false);
    }
  }

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
      <header className="workspace-header"><a className="workspace-brand" href="/"><span>D</span> DEPUKO</a><nav><a href="/business">Workspace</a><a href="/business/orders">Orders</a><a href="/business/services">Services</a><a href="/business/staff">Staff</a></nav><div className="workspace-header-actions"><ThemeToggle /><a className="workspace-logout" href="/login">Sign in</a></div></header>
      <section className="workspace-heading"><span className="workspace-kicker">BUSINESS OPERATIONS</span><h1>Business workspace</h1><p>Manage your organization, services and daily operations.</p></section>
      <section className="workspace-card"><h2>Your organization</h2>
      {loadingOrganizations ? <p>Loading your business profile…</p> : organizations.length > 0 ? (
        <>
          <p>Your organizations are securely loaded from your signed-in account.</p>
          {organizations.length > 1 ? (
            <select className="workspace-input" value={orgId} onChange={e => setOrgId(e.target.value)} aria-label="Select organization">
              {organizations.map(org => <option key={org.id} value={org.id}>{org.legal_name} · {org.role}</option>)}
            </select>
          ) : <p>{organizations[0].legal_name} · {organizations[0].industry} · {organizations[0].status}</p>}
        </>
      ) : requiresSignIn ? (
        <p><a href="/login">Sign in</a> to access or register a business workspace.</p>
      ) : (
        <form onSubmit={createBusiness} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
          <p>No business is linked to this account yet. Register your organization to create its workspace.</p>
          <select required className="workspace-input" value={templateId} onChange={e => setTemplateId(e.target.value)} aria-label="Business type">
            <option value="" disabled>Select a business type</option>
            {templates.map(template => <option key={template.id} value={template.id}>{template.label}</option>)}
          </select>
          <input required className="workspace-input" placeholder="Legal business name" value={legalName} onChange={e => setLegalName(e.target.value)} aria-label="Legal business name" />
          <input required className="workspace-input" minLength={2} maxLength={2} pattern="[A-Z]{2}" placeholder="Country code (RW)" value={country} onChange={e => setCountry(e.target.value.toUpperCase())} aria-label="Two-letter ISO country code" />
          <input required className="workspace-input" placeholder="Industry" value={industry} onChange={e => setIndustry(e.target.value)} aria-label="Industry" />
          <button type="submit" disabled={creatingBusiness || !templateId}>{creatingBusiness ? "Creating workspace…" : "Register business"}</button>
        </form>
      )}
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