"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "../../../lib/session";
import { ThemeToggle } from "../../../components/ThemeProvider";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://depuko-api-production.up.railway.app/api/v1";
type Course={id:string;title:string;summary:string;content_url:string|null;duration_minutes:number;enrollment_id:string|null;enrollment_status:string|null;progress_percent:number|null};
async function call<T>(path:string,token:string,method="GET",body?:unknown):Promise<T>{
 const response=await fetch(API+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message??"Request failed ("+response.status+")");return data as T;
}
export default function WorkerTraining(){
 const {token}=useSession();const [courses,setCourses]=useState<Course[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{if(!token)return;const r=await call<{courses:Course[]}>("/training/courses",token);setCourses(r.courses??[])},[token]);
 useEffect(()=>{if(token)void refresh().catch(e=>setError(e.message))},[refresh,token]);
 async function enroll(id:string){if(!token)return;setBusy(true);setError("");setNotice("");try{await call("/training/courses/"+id+"/enroll",token,"POST");setNotice("You are enrolled in this course.");await refresh()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function complete(id:string){if(!token)return;setBusy(true);setError("");setNotice("");try{await call("/training/enrollments/"+id+"/progress",token,"POST",{progressPercent:100});setNotice("Course marked complete. Completion is self-reported.");await refresh()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 if(!token)return <main className="worker-page"><header className="worker-header"><Link className="workspace-brand" href="/"><span>D</span> DEPUKO</Link><ThemeToggle/></header><section className="worker-card worker-login"><h1>Sign in to training</h1><p>Sign in to access DEPUKO worker learning resources.</p><Link href="/login">Sign in</Link></section></main>;
 return <main className="worker-page"><header className="worker-header"><Link className="workspace-brand" href="/"><span>D</span> DEPUKO</Link><div className="workspace-header-actions"><ThemeToggle/><Link className="workspace-logout" href="/worker">Worker workspace</Link></div></header><div className="worker-shell">
  <section className="worker-heading"><div className="workspace-kicker">WORKER DEVELOPMENT</div><h1>Training and learning</h1><p>Explore learning resources assigned by DEPUKO and track your progress.</p></section>
  {error&&<p className="notice-error" role="alert">{error}</p>}{notice&&<p className="worker-card" role="status">{notice}</p>}
  <section className="worker-card"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><h2>Available courses</h2><button disabled={busy} onClick={()=>void refresh()}>Refresh</button></div>
   {!courses.length?<p>No active training courses are available yet.</p>:courses.map(course=><article className="worker-assignment" key={course.id}><div style={{minWidth:0,flex:1}}><strong>{course.title}</strong><p>{course.summary}</p><small>{course.duration_minutes} minutes</small>{course.enrollment_id&&<p className="worker-status">{course.enrollment_status} · {course.progress_percent??0}%</p>}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{course.content_url&&<a href={course.content_url} target="_blank" rel="noopener noreferrer">Open course material</a>}{!course.enrollment_id?<button disabled={busy} onClick={()=>void enroll(course.id)}>Enroll</button>:course.enrollment_status!=="completed"?<button disabled={busy} onClick={()=>void complete(course.enrollment_id!)}>Mark complete</button>:<span className="worker-status">Completed</span>}</div></article>)}
  </section>
  <p className="worker-card">Course completion is currently self-reported. It is not a verified professional qualification unless DEPUKO separately records an approved assessment.</p>
 </div></main>;
}