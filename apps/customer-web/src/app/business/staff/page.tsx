"use client";
/** Staff management: invite members with roles. Role escalation is blocked
 * server-side (only owner/admin may invite; roles constrained by the enum).
 * Every invite is audited on the backend. */
import { useState } from "react";
import { api, ApiError } from "../../../lib/api";

const ROLES = ["admin", "finance", "manager", "staff"];

export default function BusinessStaff() {
  const [orgId, setOrgId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("staff");
  const [msg, setMsg] = useState<string | null>(null);

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
        <input placeholder="Organization id" value={orgId} onChange={e => setOrgId(e.target.value)} style={{ padding: 12 }} aria-label="org id" />
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