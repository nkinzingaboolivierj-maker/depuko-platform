"use client";
import { useState } from "react";
import { adminApi } from "../../lib/api";
import { useAdminSession } from "../../components/AdminSessionProvider";

export default function AdminOperations() {
  const { token, logout } = useAdminSession();
  const [orders, setOrders] = useState<{status:string;count:string}[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function load() {
    setNote(null); setLoading(true);
    try { setOrders(await adminApi.analyticsOrders(token)); }
    catch { setNote("Analytics unavailable — verify the analytics:read permission and API health."); }
    finally { setLoading(false); }
  }
  return <div className="admin-shell">
    <aside className="admin-sidebar"><a href="/" className="admin-brand"><span className="admin-brand-mark">D</span> DEPUKO</a><div className="admin-workspace-label">Workspace</div><nav className="admin-nav"><a href="/">Overview</a><a href="/command-center">Command center</a><a aria-current="page" href="/operations">Operations</a></nav><div className="admin-sidebar-foot">Operational data is measured from authorized API responses.</div></aside>
    <main className="admin-main">
      <div className="admin-topbar"><span className="admin-breadcrumb">Workspace / Operations</span><button className="admin-signout" onClick={logout}>Sign out</button></div>
      <header className="admin-heading"><span className="admin-kicker">OPERATIONS</span><h1>Operations overview</h1><p>Measured activity and platform readiness.</p></header>
      <section className="admin-card"><h2>Order analytics</h2><p>Load measured order counts from the protected analytics endpoint.</p><div className="admin-form-row"><button disabled={loading} onClick={load}>{loading ? "Loading…" : "Load analytics"}</button></div>
        {note && <p role="alert">{note}</p>}
        {orders && <div style={{overflowX:"auto",marginTop:18}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>Order status</th><th style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>Measured count</th></tr></thead><tbody>{orders.map((order,index)=><tr key={index}><td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{order.status}</td><td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{order.count}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="admin-section admin-card"><h2>Operational constraints</h2><ul style={{color:"#64748b",fontSize:13,lineHeight:1.9}}><li>Worker verification and trust restrictions require human rationale.</li><li>Dispute resolution requires explicit payment permissions.</li><li>Payroll is unavailable until reviewed country rules are registered.</li><li>Real-money payment processing remains disabled pending webhook integrity verification.</li></ul></section>
    </main>
  </div>;
}