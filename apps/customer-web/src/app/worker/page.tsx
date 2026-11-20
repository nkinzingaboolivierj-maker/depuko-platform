"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "../../components/ThemeProvider";
import { useSession } from "../../lib/session";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";
type Profile = { userId: string; headline: string; country: string; skills: string[]; verificationStatus: string } | null;
type Opportunity = { id: string; role: string; required_skills: string[]; region: string; mode: string; compensation_cents: number | string; duration_days: number; status: string };
type Application = { id: string; opportunity_id: string; stage: string; role: string; region: string; compensation_cents: number | string };
type Payout = { id: string; amount_cents: number; currency: string; status: string; created_at: string };
type Skill = { skill_id: string; name?: string; verification?: string };

async function request<T>(path: string, token: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(API + path, {
    method,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.message === "string" ? payload.message : "Request failed (" + response.status + ")");
  return payload as T;
}

const money = (amount: number | string, currency = "RWF") => new Intl.NumberFormat("en-RW", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount) / 100);

export default function WorkerPortal() {
  const { token, login, logout, error: sessionError } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<Profile>(null);
  const [headline, setHeadline] = useState("");
  const [country, setCountry] = useState("RW");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillId, setSkillId] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [ticketCategory, setTicketCategory] = useState("account");
  const [ticketId, setTicketId] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketReplies, setTicketReplies] = useState<{ body: string }[]>([]);
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async (session = token) => {
    if (!session) return;
    setBusy(true);
    setError("");
    const [p, o, a, pay, s] = await Promise.allSettled([
      request<{ profile: Profile }>("/workforce/me/profile", session),
      request<{ opportunities: Opportunity[] }>("/opportunities", session),
      request<{ applications: Application[] }>("/opportunities/applications/mine", session),
      request<{ payouts: Payout[] }>("/payouts/mine", session),
      request<Skill[]>("/skills/workers/me/verified", session),
    ]);
    if (p.status === "fulfilled") {
      setProfile(p.value.profile);
      setHeadline(p.value.profile?.headline ?? "");
      setCountry(p.value.profile?.country ?? "RW");
    } else setError("Profile: " + p.reason.message);
    if (o.status === "fulfilled") setOpportunities(o.value.opportunities ?? []);
    else setError(value => value || "Opportunities are temporarily unavailable.");
    if (a.status === "fulfilled") setApplications(a.value.applications ?? []);
    else setError(value => value || "Applications are temporarily unavailable.");
    if (pay.status === "fulfilled") setPayouts(pay.value.payouts ?? []);
    else setError(value => value || "Payout history is temporarily unavailable.");
    if (s.status === "fulfilled") setSkills(Array.isArray(s.value) ? s.value : []);
    else setError(value => value || "Verified skills are temporarily unavailable.");
    setBusy(false);
  }, [token]);

  useEffect(() => { if (token) void refresh(token); }, [token, refresh]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const success = await login(email, password);
    setBusy(false);
    if (!success) setError(sessionError ?? "Sign in failed.");
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await request("/workforce/me/profile", token, "POST", { headline, country });
      setNotice("Your worker profile has been saved.");
      await refresh(token);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function apply(id: string) {
    if (!token) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await request("/opportunities/" + id + "/applications", token, "POST");
      setNotice("Your application has been submitted.");
      await refresh(token);
      setTab("applications");
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function claimSkill(event: FormEvent) {
    event.preventDefault();
    if (!token || !skillId.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await request("/skills/claims", token, "POST", { skillId: skillId.trim() });
      setNotice("Skill claim saved. It remains self-declared until an administrator verifies it.");
      setSkillId("");
      await refresh(token);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function attachEvidence(event: FormEvent) {
    event.preventDefault();
    if (!token || !skillId.trim() || !evidenceRef.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await request("/skills/claims/evidence", token, "POST", { skillId: skillId.trim(), evidenceRef: evidenceRef.trim() });
      setNotice("Evidence reference attached to your skill claim.");
      setEvidenceRef("");
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function openTicket(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await request<{ ticketId: string }>("/support/tickets", token, "POST", { category: ticketCategory });
      setTicketId(result.ticketId);
      setTicketReplies([]);
      setNotice("Support ticket created: " + result.ticketId);
      setTab("support");
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function sendTicketReply(event: FormEvent) {
    event.preventDefault();
    if (!token || !ticketId || !ticketMessage.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await request("/support/tickets/" + ticketId + "/messages", token, "POST", { body: ticketMessage.trim() });
      const result = await request<{ messages: { body: string }[] }>("/support/tickets/" + ticketId, token);
      setTicketReplies(result.messages ?? []);
      setTicketMessage("");
      setNotice("Your message has been sent.");
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  const totalPaid = useMemo(() => payouts.filter(p => p.status === "paid").reduce((sum, p) => sum + Number(p.amount_cents), 0), [payouts]);

  if (!token) return <main className="worker-page"><header className="worker-header"><a className="workspace-brand" href="/"><span>D</span> DEPUKO</a><div className="workspace-header-actions"><ThemeToggle/><a className="workspace-logout" href="/register">Create worker account</a></div></header><div className="worker-shell"><section className="worker-card worker-login"><div className="workspace-kicker">WORKER PORTAL</div><h1>Welcome to your workspace</h1><p>Sign in to manage your profile, discover work, track applications and review earnings.</p><form onSubmit={signIn}><input type="email" required autoComplete="username" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/><input type="password" required autoComplete="current-password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/><button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form>{(error || sessionError) && <p role="alert">{error || sessionError}</p>}</section></div></main>;

  const nav = [{id:"overview",label:"Overview"},{id:"profile",label:"Profile"},{id:"opportunities",label:"Find work"},{id:"applications",label:"Applications"},{id:"earnings",label:"Earnings"},{id:"skills",label:"Skills"},{id:"support",label:"Support"}];
  return <main className="worker-page">
    <header className="worker-header"><a className="workspace-brand" href="/"><span>D</span> DEPUKO</a><div className="workspace-header-actions"><ThemeToggle/><button className="workspace-logout" onClick={logout}>Sign out</button></div></header>
    <div className="worker-shell">
      <section className="worker-heading"><div className="workspace-kicker">WORKER WORKSPACE</div><h1>{profile?.headline || "Your professional workspace"}</h1><p>Manage your work profile, find opportunities and keep track of your progress.</p></section>
      <nav aria-label="Worker navigation" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{nav.map(item=><button key={item.id} onClick={()=>setTab(item.id)} aria-current={tab===item.id?"page":undefined} style={{background:tab===item.id?"#06152a":"transparent",color:tab===item.id?"#fff":"var(--ink)",border:"1px solid var(--line)"}}>{item.label}</button>)}</nav>
      {error && <p className="notice-error" role="alert">{error}</p>}{notice && <p className="worker-card" role="status">{notice}</p>}
      {tab==="overview" && <><section className="worker-card"><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><h2>Account status</h2><p>Verification is reviewed by DEPUKO. Self-declared skills do not count as verified.</p></div><button onClick={()=>void refresh()} disabled={busy}>{busy?"Refreshing…":"Refresh"}</button></div><p className="worker-status">{profile?.verificationStatus ?? "profile not completed"}</p></section><div className="worker-card" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:18}}><div><small>Open opportunities</small><h2>{opportunities.length}</h2></div><div><small>Applications</small><h2>{applications.length}</h2></div><div><small>Paid earnings</small><h2>{money(totalPaid)}</h2></div><div><small>Verified skills</small><h2>{skills.length}</h2></div></div></>}
      {tab==="profile" && <section className="worker-card"><h2>Professional profile</h2><form onSubmit={saveProfile} style={{display:"grid",gap:12,maxWidth:600}}><label>Professional headline<input required minLength={3} maxLength={160} value={headline} onChange={e=>setHeadline(e.target.value)} placeholder="e.g. Electrician with residential experience"/></label><label>Country code<input required pattern="[A-Za-z]{2}" maxLength={2} value={country} onChange={e=>setCountry(e.target.value.toUpperCase())}/></label><p>Verification status: <strong>{profile?.verificationStatus ?? "pending"}</strong></p><button disabled={saving}>{saving?"Saving…":"Save profile"}</button></form></section>}
      {tab==="opportunities" && <section className="worker-card"><h2>Available opportunities</h2><p>Apply only when your profile is complete and verified.</p>{!opportunities.length?<p>No published opportunities are currently available.</p>:opportunities.map(item=><article className="worker-assignment" key={item.id}><div style={{minWidth:0,flex:1}}><strong>{item.role}</strong><p>{item.region} · {item.mode} · {item.duration_days} days</p><p>{(item.required_skills??[]).join(", ")}</p><b>{money(item.compensation_cents)}</b></div><button disabled={saving || profile?.verificationStatus!=="verified" || applications.some(a=>a.opportunity_id===item.id)} onClick={()=>void apply(item.id)}>{applications.some(a=>a.opportunity_id===item.id)?"Applied":"Apply"}</button></article>)}</section>}
      {tab==="applications" && <section className="worker-card"><h2>My applications</h2>{!applications.length?<p>You have not submitted any applications yet.</p>:applications.map(item=><article className="worker-assignment" key={item.id}><div><strong>{item.role}</strong><p>{item.region} · {money(item.compensation_cents)}</p></div><span className="worker-status">{item.stage.replaceAll("_"," ")}</span></article>)}</section>}
      {tab==="earnings" && <section className="worker-card"><h2>Earnings and payouts</h2><p>Amounts shown are payout records returned by the platform. Pending amounts are not represented as paid.</p><h2>{money(totalPaid)} <small>paid to date</small></h2>{!payouts.length?<p>No payout records are available yet.</p>:payouts.map(item=><article className="worker-assignment" key={item.id}><div><strong>{money(item.amount_cents,item.currency)}</strong><p>{new Date(item.created_at).toLocaleDateString()}</p></div><span className="worker-status">{item.status}</span></article>)}</section>}
      {tab==="skills" && <><section className="worker-card"><h2>Claim a skill</h2><p>Use the skill ID supplied by DEPUKO. Claims remain self-declared until independently verified.</p><form onSubmit={claimSkill} style={{display:"flex",gap:10,flexWrap:"wrap"}}><input required value={skillId} onChange={e=>setSkillId(e.target.value)} placeholder="Skill ID" style={{flex:1,minWidth:180,padding:12}}/><button disabled={saving}>Submit claim</button></form></section><section className="worker-card"><h2>Attach evidence</h2><form onSubmit={attachEvidence} style={{display:"grid",gap:10,maxWidth:600}}><input required value={skillId} onChange={e=>setSkillId(e.target.value)} placeholder="Skill ID"/><input required value={evidenceRef} onChange={e=>setEvidenceRef(e.target.value)} placeholder="Evidence reference or secure file ID"/><button disabled={saving}>Attach evidence</button></form></section><section className="worker-card"><h2>Verified skills</h2>{skills.length?skills.map((skill,index)=><p key={skill.skill_id??index}>{skill.name ?? skill.skill_id} <span className="worker-status">verified</span></p>):<p>No skills have been verified yet.</p>}</section></>}
      {tab==="support" && <><section className="worker-card"><h2>Contact support</h2><form onSubmit={openTicket} style={{display:"flex",gap:10,flexWrap:"wrap"}}><select value={ticketCategory} onChange={e=>setTicketCategory(e.target.value)}><option value="account">Account</option><option value="payments">Payments</option><option value="work">Work opportunity</option><option value="safety">Safety</option><option value="technical">Technical issue</option></select><button disabled={saving}>Open support ticket</button></form></section>{ticketId && <section className="worker-card"><h2>Ticket {ticketId}</h2>{ticketReplies.map((reply,index)=><p key={index}>{reply.body}</p>)}<form onSubmit={sendTicketReply} style={{display:"flex",gap:10,flexWrap:"wrap"}}><input required value={ticketMessage} onChange={e=>setTicketMessage(e.target.value)} placeholder="Write a message…" style={{flex:1,minWidth:180,padding:12}}/><button disabled={saving}>Send</button></form></section>}</>}
    </div>
  </main>;
}