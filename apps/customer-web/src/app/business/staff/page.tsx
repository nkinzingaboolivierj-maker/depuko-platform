"use client";
/** Staff management: invite members with roles. Role escalation is blocked
 * server-side (only owner/admin may invite; roles constrained by the enum).
 * Every invite is audited on the backend. */
import { useEffect, useState } from "react";
import { api, ApiError } from "../../../lib/api";

const ROLES = ["admin", "finance", "manager", "staff"];

export default function BusinessStaff() {
  const [organizations, setOrganizations] = useState<{ id: string; legal_name: string; role: string }[]>([]);
  const [orgId, setOrgId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("staff");
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

  async function invite() {
    setMsg(null);
    try {
      await api.organization.inviteMember(orgId, userId, role);
      setMsg(`Invited ${userId} as ${role}.`);
    } catch (e) {
      setMsg(e instanceof ApiError ? `Invite failed (${e.status}) - are you owner/admin?` : "Network error");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Business - Staff</h1>
      <div style={{ display: "grid", gap: 8, maxWidth: 400 }}>
        {organizations.length > 1 ? <select value={orgId} onChange={e => setOrgId(e.target.value)} aria-label="Select organization">{organizations.map(org => <option key={org.id} value={org.id}>{org.legal_name} · {org.role}</option>)}</select> : organizations.length === 1 ? <p>{organizations[0].legal_name} · {organizations[0].role}</p> : <p>No organization found. <a href="/business">Open business workspace</a>.</p>}
        <input placeholder="User id to invite" value={userId} onChange={e => setUserId(e.target.value)} style={{ padding: 12 }} aria-label="user id" />
        <select value={role} onChange={e => setRole(e.target.value)} aria-label="role">
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={invite} disabled={!orgId || !userId}>Invite</button>
      </div>
      {msg && <p role="status">{msg}</p>}
    </main>
  );
}