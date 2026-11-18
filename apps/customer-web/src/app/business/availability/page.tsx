"use client";
/** Availability + branch service areas (V7.4): stored via the organizations
 * endpoints; configuration-driven, no hardcoded business-type logic. */
import { useState } from "react";
import { api, ApiError } from "../../../lib/api";

export default function BusinessAvailability() {
  const [orgId, setOrgId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [region, setRegion] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

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
        <input placeholder="Organization id" value={orgId} onChange={e => setOrgId(e.target.value)} style={{ padding: 12 }} aria-label="org id" />
        <input placeholder="Branch name" value={branchName} onChange={e => setBranchName(e.target.value)} style={{ padding: 12 }} aria-label="branch name" />
        <input placeholder="Region served (e.g. Kigali / Gasabo)" value={region} onChange={e => setRegion(e.target.value)} style={{ padding: 12 }} aria-label="region" />
        <button onClick={addBranch} disabled={!orgId || !branchName || !region}>Add branch + area</button>
      </div>
      {msg && <p role="status">{msg}</p>}
    </main>
  );
}