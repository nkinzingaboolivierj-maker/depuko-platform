"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";
import { ThemeToggle } from "./ThemeProvider";
import { useSession } from "../lib/session";
import { WorkspaceIcon, WorkspaceIconName } from "./WorkspaceIcon";

const navigation: { label: string; href: string; icon: WorkspaceIconName }[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Projects", href: "/projects", icon: "folder" },
  { label: "Marketplace", href: "/business/services", icon: "grid" },
  { label: "Messages", href: "/support", icon: "message" },
  { label: "Notifications", href: "/notifications", icon: "bell" },
  { label: "Wallet", href: "/billing", icon: "wallet" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

export function WorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { token } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Keep authentication screens focused. A worker without a session sees the worker sign-in screen.
  if (pathname === "/login" || pathname === "/register" || (pathname.startsWith("/worker") && !token)) {
    return <>{children}</>;
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    router.push("/assistant?prompt=" + encodeURIComponent(value));
    setMobileOpen(false);
  }

  return (
    <div className={"dp-shell" + (collapsed ? " dp-collapsed" : "") + (mobileOpen ? " dp-mobile-open" : "")}>
      {mobileOpen && <button className="dp-mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className="dp-sidebar">
        <Link className="dp-brand" href="/" aria-label="DEPUKO home">
          <span className="dp-brand-mark">D</span><span className="dp-brand-word">DEPUKO</span>
        </Link>
        <div className="dp-sidebar-label">WORKSPACE</div>
        <nav className="dp-nav" aria-label="Main navigation">
          {navigation.map(item => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
            return <Link key={item.href} className="dp-nav-link" href={item.href} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined} onClick={() => setMobileOpen(false)}>
              <WorkspaceIcon name={item.icon} /><span>{item.label}</span>
            </Link>;
          })}
        </nav>
        <div className="dp-sidebar-bottom">
          <div className="dp-plan-card">
            <span className="dp-plan-icon"><WorkspaceIcon name="sparkles" size={16}/></span>
            <strong>Make more happen</strong>
            <p>Keep your work and services moving in one place.</p>
            <Link href="/billing">Explore plans <WorkspaceIcon name="arrow" size={13}/></Link>
          </div>
          <div className="dp-sidebar-foot">DEPUKO WORKSPACE <span>Built for people who make things happen.</span></div>
        </div>
      </aside>

      <div className="dp-main">
        <header className="dp-topbar">
          <button className="dp-icon-button dp-desktop-collapse" type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}>
            <WorkspaceIcon name="menu" />
          </button>
          <button className="dp-icon-button dp-mobile-menu" type="button" onClick={() => setMobileOpen(value => !value)} aria-label="Open navigation" aria-expanded={mobileOpen}>
            <WorkspaceIcon name="menu" />
          </button>
          <form className="dp-global-search" onSubmit={submitSearch}>
            <WorkspaceIcon name="search" size={17}/>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search anything or ask DEPUKO AI..." aria-label="Search DEPUKO"/>
            <kbd>⌘ K</kbd>
          </form>
          <div className="dp-topbar-actions">
            <ThemeToggle/>
            <Link href="/settings" className="dp-profile-button" aria-label="Open account settings"><WorkspaceIcon name="user" size={17}/></Link>
          </div>
        </header>
        <main className="dp-route">{children}</main>
      </div>
    </div>
  );
}
