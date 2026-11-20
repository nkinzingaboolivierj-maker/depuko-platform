"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAdminSession } from "../../components/AdminSessionProvider";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://depuko-api-production.up.railway.app/api/v1";
type Item={id:string;kind:string;audience:string;plan_key:string;title:string;description:string;amount_cents:number|string;currency:string;billing_interval:string;active:boolean};
async function call<T>(path:string,token:string,method="GET",body?:unknown):Promise<T>{
 const response=await fetch(API+path,{method,headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message??"Request failed ("+response.status+")");return data as T;
}
export default function PricingAdmin(){
 const {token,logout}=useAdminSession();
 const [items,setItems]=useState<Item[]>([]);
 const [kind,setKind]=useState<"registration_fee"|"subscription">("registration_fee");
 const [audience,setAudience]=useState("customer");
 const [planKey,setPlanKey]=useState("registration");
 const [title,setTitle]=useState("Customer registration");
 const [description,setDescription]=useState("");
 const [amount,setAmount]=useState("");
 const [currency,setCurrency]=useState("RWF");
 const [interval,setInterval]=useState("one_time");
 const [active,setActive]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{const r=await call<{items:Item[]}>("/billing/admin/catalog",token);setItems(r.items??[])},[token]);
 useEffect(()=>{if(token)void refresh().catch(e=>setError(e.message))},[refresh,token]);
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{await call("/billing/catalog",token,"POST",{kind,audience,planKey,title,description,amountCents:Math.round(Number(amount)*100),currency,billingInterval:interval,active});setNotice("Pricing catalog item saved.");await refresh();}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div className="admin-shell"><aside className="admin-sidebar"><a href="/" className="admin-brand"><span className="admin-brand-mark">D</span> DEPUKO</a><div className="admin-workspace-label">Workspace</div><nav className="admin-nav"><a href="/">Overview</a><a href="/command-center">Command center</a><a aria-current="page" href="/pricing">Fees & plans</a></nav><div className="admin-sidebar-foot">Pricing changes require administrator permission. Payments remain pending until provider verification.</div></aside><main className="admin-main"><div className="admin-topbar"><span className="admin-breadcrumb">Workspace / Fees & plans</span><button className="admin-signout" onClick={logout}>Sign out</button></div><header className="admin-heading"><span className="admin-kicker">BILLING CONFIGURATION</span><h1>Registration fees & subscriptions</h1><p>Set independent one-time registration fees and recurring plans for each account category.</p></header>
  {error&&<p className="admin-notice" role="alert">{error}</p>}{notice&&<p className="admin-notice" role="status">{notice}</p>}
  <section className="admin-card"><h2>Create or update a price</h2><form onSubmit={submit} style={{display:"grid",gap:12,maxWidth:760}}>
   <div className="admin-form-row"><label>Type<select value={kind} onChange={e=>{const v=e.target.value as typeof kind;setKind(v);setInterval(v==="registration_fee"?"one_time":"monthly");setPlanKey(v==="registration_fee"?"registration":"standard")}}><option value="registration_fee">One-time registration fee</option><option value="subscription">Subscription</option></select></label><label>Account category<select value={audience} onChange={e=>setAudience(e.target.value)}><option value="customer">Customer</option><option value="worker">Worker</option><option value="business">Business</option></select></label></div>
   <div className="admin-form-row"><label>Plan key<input required value={planKey} onChange={e=>setPlanKey(e.target.value)} placeholder="e.g. basic"/></label><label>Display title<input required value={title} onChange={e=>setTitle(e.target.value)}/></label></div>
   <label>Description<input value={description} onChange={e=>setDescription(e.target.value)}/></label>
   <div className="admin-form-row"><label>Amount (major units)<input required type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Currency<input required maxLength={3} value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())}/></label><label>Interval<select value={interval} onChange={e=>setInterval(e.target.value)} disabled={kind==="registration_fee"}><option value="one_time">One time</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label></div>
   <label><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Active and visible in customer billing</label><button disabled={busy}>{busy?"Saving…":"Save pricing"}</button>
  </form></section>
  <section className="admin-card admin-section"><h2>Configured catalog</h2>{items.length?items.map(item=><article className="admin-assignment" key={item.id}><div><strong>{item.title}</strong><p>{item.kind} · {item.audience} · {item.plan_key}</p><small>{item.amount_cents} {item.currency} · {item.billing_interval} · {item.active?"Active":"Inactive"}</small></div></article>):<p>No catalog items configured.</p>}</section>
  <p className="admin-notice admin-section">This configures price records only. Do not treat a pending fee or subscription as paid. Payment-provider onboarding, confirmed webhook settlement and refund handling must pass verification before real-money payments are enabled.</p>
 </main></div>;
}