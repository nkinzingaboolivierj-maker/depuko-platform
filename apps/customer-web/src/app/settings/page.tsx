"use client";

import { ThemeToggle } from "../../components/ThemeProvider";
import { WorkspaceIcon } from "../../components/WorkspaceIcon";

export default function SettingsPage() {
  return <div className="dp-settings-page">
    <div className="dp-home-section-head"><div><span className="dp-home-eyebrow">PREFERENCES</span><h2 style={{fontSize:28,marginTop:12}}>Settings</h2><p>Manage the way DEPUKO works on your device.</p></div></div>
    <section className="dp-settings-panel" style={{marginTop:22}}>
      <div className="dp-settings-card">
        <div><h2>Appearance</h2><p>Choose a light or dark workspace. Your preference is saved on this device.</p></div>
        <ThemeToggle/>
      </div>
      <div className="dp-settings-card">
        <div><h2>Account security</h2><p>Use a strong password and sign out when you finish using a shared device.</p></div>
        <WorkspaceIcon name="shield" size={21}/>
      </div>
      <div className="dp-settings-card">
        <div><h2>Help and support</h2><p>Open a support request for account, service or technical questions.</p></div>
        <a href="/support" style={{color:"var(--dp-text)",fontSize:12,fontWeight:700,textDecoration:"none"}}>Open support</a>
      </div>
    </section>
  </div>;
}
