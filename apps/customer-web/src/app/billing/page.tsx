"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "../../lib/session";
import { ThemeToggle } from "../../components/ThemeProvider";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://depuko-api-production.up.railway.app/api/v1";
type CatalogItem={id:string;kind:"registration_fee"|"subscription";audience:"customer"|"worker"|"business";plan_key:string;title:string;description:string;amount_cents:number|string;currency:string;billing_interval:string};
type BillingState={registrationFees:{id:string;audience:string;amount_cents:number|string;currency:string;status:string}[];subscriptions:{id:string;audience:string;amount_cents:number|string;currency:string;billing_interval:string;status:string;plan_key:string;title:string}[]};
async function call<T>(path:string,token:string,method="GET",body?:unknown):Promise<T>{
 const response=await fetch(API+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.message??"Request failed ("+response.status+")");
 return data as T;
}
const format=(amount:number|string,currency:string)=>new Intl.NumberFormat("en-RW",{style:"currency",currency,maximumFractionDigits:0}).format(Number(amount)/100);

export default function BillingPage(){
 const {token}=useSession();
 const [items,setItems]=useState<CatalogItem[]>([]);
 const [mine,setMine]=useState<BillingState>({registrationFees:[],subscriptions:[]});
 const [audience,setAudience]=useState<"customer"|"worker"|"business">("customer");
 const [organizationId,setOrganizationId]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  if(!token)return;
  const [catalog,state]=await Promise.all([call<{items:CatalogItem[]}>("/billing/catalog",token),call<BillingState>("/billing/me",token)]);
  setItems(catalog.items??[]);setMine(state);
 },[token]);
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[refresh]);
 async function createFee(event:FormEvent){
  event.preventDefault();if(!token)return;setBusy(true);setError("");setNotice("");
  try{const result=await call<{registrationFee:{status:string}}>("/billing/registration-fees",token,"POST",{audience,organizationId:audience==="business"?organizationId:undefined});setNotice("Registration fee record: "+result.registrationFee.status+". Payment processing is not enabled yet.");await refresh();}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function subscribe(item:CatalogItem){
  if(!token)return;setBusy(true);setError("");setNotice("");
  try{const result=await call<{subscription:{status:string}}>("/billing/subscriptions",token,"POST",{audience,planKey:item.plan_key,organizationId:audience==="business"?organizationId:undefined});setNotice("Subscription status: "+result.subscription.status+". Payment processing is not enabled yet.");await refresh();}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function cancel(id:string){
  if(!token)return;setBusy(true);setError("");setNotice("");
  try{await call("/billing/subscriptions/"+id+"/cancel",token,"POST");setNotice("Subscription cancelled.");await refresh();}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 if(!token)return <main className="auth-page"><section className="auth-card"><h1>Sign in to billing</h1><p>Sign in to view registration fees and subscriptions.</p><Link href="/login">Sign in</Link></section></main>;
 const feeItems=items.filter(x=>x.kind==="registration_fee"&&x.audience===audience);
 const planItems=items.filter(x=>x.kind==="subscription"&&x.audience===audience);
 return <main className="worker-page"><header className="worker-header"><a className="workspace-brand" href="/"><span>D</span> DEPUKO</a><div className="workspace-header-actions"><ThemeToggle/><Link href="/">Home</Link></div></header><div className="worker-shell">
  <section className="worker-heading"><div className="workspace-kicker">ACCOUNT BILLING</div><h1>Fees and subscriptions</h1><p>Registration is a one-time fee. Subscriptions are separate recurring plans and vary by account type.</p></section>
  {error&&<p className="notice-error" role="alert">{error}</p>}{notice&&<p className="worker-card" role="status">{notice}</p>}
  <section className="worker-card"><h2>Account category</h2><label>Choose account type <select value={audience} onChange={e=>setAudience(e.target.value as typeof audience)}><option value="customer">Customer</option><option value="worker">Worker</option><option value="business">Business</option></select></label>
   {audience==="business"&&<label style={{display:"block",marginTop:12}}>Organization ID <input value={organizationId} onChange={e=>setOrganizationId(e.target.value)} placeholder="Your organization ID"/></label>}
  </section>
  <section className="worker-card"><h2>One-time registration fee</h2>{feeItems.length?feeItems.map(item=><p key={item.id}><strong>{item.title}</strong> — {format(item.amount_cents,item.currency)}</p>):<p>No registration fee has been configured for this category yet.</p>}
   <form onSubmit={createFee}><button disabled={busy||(audience==="business"&&!organizationId.trim())}>Create registration fee record</button></form>
   {mine.registrationFees.filter(x=>x.audience===audience).map(f=><p key={f.id}>Current record: <strong>{f.status}</strong> · {format(f.amount_cents,f.currency)}</p>)}
  </section>
  <section className="worker-card"><h2>Subscription plans</h2>{planItems.length?planItems.map(item=><article className="worker-assignment" key={item.id}><div><strong>{item.title}</strong><p>{item.description}</p><b>{format(item.amount_cents,item.currency)} / {item.billing_interval}</b></div><button disabled={busy||(audience==="business"&&!organizationId.trim())} onClick={()=>void subscribe(item)}>Choose plan</button></article>):<p>No subscription plans are configured for this category yet.</p>}</section>
  <section className="worker-card"><h2>Your subscriptions</h2>{mine.subscriptions.length?mine.subscriptions.map(s=><article className="worker-assignment" key={s.id}><div><strong>{s.title}</strong><p>{s.audience} · {format(s.amount_cents,s.currency)} / {s.billing_interval}</p><span className="worker-status">{s.status}</span></div>{["pending","active","past_due"].includes(s.status)&&<button disabled={busy} onClick={()=>void cancel(s.id)}>Cancel</button>}</article>):<p>No subscription records yet.</p>}</section>
  <p className="worker-card">Payments are not yet connected to a verified provider. Records created here remain pending; DEPUKO will not mark fees or subscriptions as paid until a provider-confirmed payment is received.</p>
 </div></main>;
}