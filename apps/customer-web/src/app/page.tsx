"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WorkspaceIcon, WorkspaceIconName } from "../components/WorkspaceIcon";

const prompts = ["Create a film", "Design a logo", "Build a website", "Find a professional"];
const features: { title: string; description: string; href: string; icon: WorkspaceIconName }[] = [
  { title: "DEPUKO AI", description: "Describe what you need and get guided to the right next step.", href: "/assistant", icon: "sparkles" },
  { title: "Marketplace", description: "Explore services and connect with capable professionals.", href: "/business/services", icon: "grid" },
  { title: "Projects", description: "Keep your requests, project activity and progress together.", href: "/projects", icon: "folder" },
  { title: "Secure workspace", description: "Manage your account and get help when you need it.", href: "/support", icon: "shield" },
];
const categories: { title: string; prompt: string; icon: WorkspaceIconName }[] = [
  { title: "Creative & design", prompt: "I need a creative or design professional", icon: "sparkles" },
  { title: "Development & technology", prompt: "I need software or technology services", icon: "briefcase" },
  { title: "Film & photography", prompt: "I need film or photography services", icon: "grid" },
  { title: "Home & lifestyle", prompt: "I need help with a home or lifestyle service", icon: "home" },
];

export default function HomePage() {
  const [need, setNeed] = useState("");
  const router = useRouter();
  function startConversation(value = need) {
    const query = value.trim();
    if (!query) return;
    router.push("/assistant?prompt=" + encodeURIComponent(query));
  }
  function submit(event: FormEvent) { event.preventDefault(); startConversation(); }

  return <div className="home-workspace">
    <section className="dp-home-hero">
      <div className="dp-home-copy">
        <div className="dp-home-eyebrow">YOUR ALL-IN-ONE SERVICES WORKSPACE</div>
        <h1>Build. Connect.<br/><span>Grow together.</span></h1>
        <p>Your all-in-one platform to find services, build projects and achieve more. Tell DEPUKO what you need and we’ll help you find the right next step.</p>
        <form className="dp-home-composer" onSubmit={submit}>
          <WorkspaceIcon name="search" size={19}/>
          <input value={need} onChange={event => setNeed(event.target.value)} placeholder="Start a conversation with DEPUKO AI..." aria-label="Describe what you need"/>
          <button type="submit" disabled={!need.trim()} aria-label="Start conversation"><WorkspaceIcon name="send" size={17}/></button>
        </form>
        <div className="dp-home-prompts">{prompts.map(prompt => <button key={prompt} type="button" onClick={() => startConversation(prompt)}>{prompt}</button>)}</div>
      </div>
    </section>
    <section>
      <div className="dp-home-section-head"><div><h2>Everything you need, in one workspace</h2><p>Move from an idea to the people and services that make it happen.</p></div><Link href="/assistant">Open DEPUKO AI <WorkspaceIcon name="arrow" size={14}/></Link></div>
      <div className="dp-feature-grid" style={{marginTop:15}}>
        {features.map(item => <Link key={item.title} className="dp-feature-card" href={item.href}><span className="dp-feature-icon"><WorkspaceIcon name={item.icon} size={18}/></span><strong>{item.title}</strong><p>{item.description}</p></Link>)}
      </div>
    </section>
    <section>
      <div className="dp-home-section-head"><div><h2>Explore by category</h2><p>Start with the area closest to your goal.</p></div><Link href="/business/services">Browse marketplace <WorkspaceIcon name="arrow" size={14}/></Link></div>
      <div className="dp-category-grid" style={{marginTop:15}}>
        {categories.map(item => <button key={item.title} className="dp-category-card" type="button" onClick={() => startConversation(item.prompt)}><WorkspaceIcon name={item.icon} size={18}/><span>{item.title}</span><WorkspaceIcon name="arrow" size={13}/></button>)}
      </div>
    </section>
  </div>;
}
