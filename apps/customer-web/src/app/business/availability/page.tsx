"use client";
/** Availability + branch service areas (V7.4): stored via the organizations
 * endpoints; configuration-driven, no hardcoded business-type logic. */
import { useEffect, useState } from "react";
import { api, ApiError } from "../../../lib/api";

export default function BusinessAvailability() {
  const [organizations, setOrganizations] = useState<{ id: string; legal_name: string; role: string }[]>([]);
  const [orgId, setOrgId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [region, setRegion] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.organization.mine().then(({ organizations: mine }) => {
      if (!active) return;
      setOrganizations(mine);
      setOrgId(current => mine.some(org => org.id === current) ? current : mine[0]?.id ?? "");
    }).catch(e => { if (active) setMsg(e instanceof ApiError ? `Could not load organizations (${e.status})` : "Network error"); });
    return () => { active = false; };
  }, []);

  async function addBranch() {
    setMsg(null);
    try {
      await api.organization.addBranch(orgId, branchName, region);
      setMsg(`Branch "${branchName}" added for ${region}.`);
      setBranchName(""); setRegion("");
    } catch (e) {
      setMsg(e instanceof ApiError ? `Failed (${e.status}) - branches module requires an owner/admin role` : "Network error");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Business - Branches & service areas</h1>
      <div style={{ display: "grid", gap: 8, maxWidth: 400 }}>
        {organizations.length > 1 ? <select value={orgId} onChange={e => setOrgId(e.target.value)} aria-label="Select organization" style={{ padding: 12 }}>{organizations.map(org => <option key={org.id} value={org.id}>{org.legal_name} · {org.role}</option>)}</select> : organizations.length === 1 ? <p>{organizations[0].legal_name} · {organizations[0].role}</p> : <p>No organization found. <a href="/business">Open business workspace</a>.</p>
        <input placeholder="Branch name" value={branchName} onChange={e => setBranchName(e.target.value)} style={{ padding: 12 }} aria-label="branch name" />
        <input placeholder="Region served (e.g. Kigali / Gasabo)" value={region} onChange={e => setRegion(e.target.value)} style={{ padding: 12 }} aria-label="region" />
        <button onClick={addBranch} disabled={!orgId || !branchName || !region}>Add branch + area</button>
      </div>
      {msg && <p role="status">{msg}</p>}
    </main>
  );
}