"use client";

import { useState } from "react";
import { api, ApiError } from "../lib/api";

type Service = { id: string; name?: string; title?: string; description?: string; category?: string; priceCents?: number; currency?: string; providerName?: string };

const categories = [
  { name: "Home & repairs", icon: "🏠", query: "home repair", tint: "mint" },
  { name: "Design & creative", icon: "🎨", query: "graphic design", tint: "peach" },
  { name: "Film & photography", icon: "🎬", query: "film production", tint: "lilac" },
  { name: "Technology", icon: "💻", query: "web development", tint: "blue" },
  { name: "Events", icon: "🎉", query: "event planning", tint: "pink" },
  { name: "Transport", icon: "🚚", query: "transport", tint: "yellow" },
];

const examples = ["Create a short film", "Fix something at home", "Design a logo", "Plan an event"];

export default function Home() {
  const [need, setNeed] = useState("");
  const [results, setResults] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);\n  const [guideInput, setGuideInput] = useState("");
  const [guideMessage, setGuideMessage] = useState("Hi! I can help you describe what you need and search DEPUKO's service catalog. What are you looking for?");

  async function search(query = need) {
    const cleaned = query.trim();
    if (!cleaned) return;
    setNeed(cleaned); setLoading(true); setError(null); setResults(null);
    try {
      const first = await api.searchServices(cleaned);
      let found = first as Service[];
      // Try a few related terms if the catalog has no exact capability match.
      const alternatives: Record<string, string[]> = {
        film: ["video production", "videography", "film production"],
        movie: ["video production", "videography", "film production"],
        video: ["videography", "video production"],
        logo: ["graphic design", "branding"],
        plumber: ["plumbing", "home repair"],
        cleaning: ["home cleaning", "cleaning service"],
      };
      const key = Object.keys(alternatives).find(k => cleaned.toLowerCase().includes(k));
      if (!found.length && key) {
        const extra = await Promise.all(alternatives[key].map(term => api.searchServices(term).catch(() => [] as Service[])));
        found = extra.flat().filter((service, i, arr) => arr.findIndex(x => x.id === service.id) === i);
      }
      setResults(found);
    } catch (e) {
      setError(e instanceof ApiError ? "We couldn't complete the search right now. Please try again." : "Connection problem. Check your internet and try again.");
    } finally { setLoading(false); }
  }

  function guide(prompt: string) {
    setGuideMessage(prompt === "Find a provider"
      ? "Tell me the service, where you need it, and when. You can also use the search box to check available providers."
      : prompt === "Help me describe my project"
      ? "Try describing the goal, the style you like, your budget range, and when you need it. Example: ‘I need a 60-second promotional film for my shop in Kigali next month.’"
      : "DEPUKO helps you discover services, compare providers, and organize requests. Choose a category or tell me what you need.");
  }

  return (
    <main className="depuko-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="DEPUKO home"><span className="brand-mark">D</span><span>DEPUKO</span></a>
        <nav className="header-nav" aria-label="Main navigation">
          <a href="#categories">Explore services</a><a href="/business">For businesses</a>
        </nav>
        <div className="header-actions"><a className="sign-in" href="/login">Sign in</a><a className="button button-dark header-join" href="/register">Get started <span>↗</span></a></div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> SERVICES, SIMPLIFIED</span>
          <h1>Big ideas.<br /><span>Made happen.</span></h1>
          <p className="hero-sub">Find the right people to bring your ideas to life. Tell us what you need—in your own words.</p>
          <form className="search-card" onSubmit={e => { e.preventDefault(); void search(); }}>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input value={need} onChange={e => setNeed(e.target.value)} placeholder="What do you need help with today?" aria-label="Describe what you need" />
            <button className="search-submit" disabled={loading || !need.trim()}>{loading ? "Searching…" : "Find help"} <span>→</span></button>
          </form>
          <p className="search-hint">Try: “I need someone to make a short film”</p>
          <div className="example-chips">{examples.map(x => <button key={x} onClick={() => { setNeed(x); void search(x); }}>{x}</button>)}</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-card art-card-main"><div className="art-spark">✦</div><div className="art-main-title">Your idea,<br />in motion.</div><div className="art-line" /><div className="art-foot"><span>DEPUKO</span><span>01 / 06</span></div></div>
          <div className="art-float art-float-top"><span className="float-icon">✓</span><span><b>Good things start</b><small>with one idea</small></span></div>
          <div className="art-float art-float-bottom"><span className="float-emoji">🎥</span><span><b>Creative projects</b><small>Find your team</small></span></div>
          <div className="art-star star-a">✦</div><div className="art-star star-b">✧</div>
        </div>
      </section>

      <section className="trust-row"><span>Made for the way you work</span><div><span>✦</span> Discover local talent</div><div><span>↗</span> Simple, transparent</div><div><span>♡</span> Built around your needs</div></section>

      <section className="category-section" id="categories">
        <div className="section-heading"><div><span className="eyebrow eyebrow-muted">EXPLORE</span><h2>What can we help with?</h2><p>Start with a category or search for exactly what you have in mind.</p></div><a href="#categories" className="text-link">Explore all <span>↗</span></a></div>
        <div className="category-grid">{categories.map(c => <button className="category-card" key={c.name} onClick={() => { setNeed(c.query); void search(c.query); }}><span className={"category-icon " + c.tint}>{c.icon}</span><span className="category-name">{c.name}</span><span className="category-arrow">↗</span></button>)}</div>
      </section>

      {(results || error) && <section className="results-panel" aria-live="polite"><div className="section-heading"><div><span className="eyebrow eyebrow-muted">SEARCH RESULTS</span><h2>{results?.length ? "Services we found" : "Let's find another way"}</h2></div><button className="clear-search" onClick={() => { setResults(null); setError(null); }}>Clear ×</button></div>
        {error && <p className="notice notice-error">{error}</p>}
        {results && results.length > 0 && <div className="result-grid">{results.map((s, i) => <article className="result-card" key={s.id}><div className="result-art">{["✦","◈","✳"][i % 3]}</div><div><h3>{s.name || s.title || s.category || "Service listing"}</h3><p>{s.description || "A service provider listed on DEPUKO."}</p>{s.providerName && <small>By {s.providerName}</small>}{typeof s.priceCents === "number" && <p className="result-price">{(s.priceCents / 100).toLocaleString()} {s.currency || "RWF"}</p>}</div></article>)}</div>}
        {results && results.length === 0 && <div className="empty-state"><div className="empty-icon">✧</div><h3>No providers found for “{need}” just yet.</h3><p>Try a broader term, explore a category, or tell us more about your project. We won't leave you at a dead end.</p><div className="empty-actions"><button className="button button-dark" onClick={() => setGuideOpen(true)}>Help me shape my request <span>→</span></button><button className="button button-light" onClick={() => { setNeed(""); setResults(null); }}>Try another search</button></div></div>}
      </section>}

      <section className="how-section"><div className="how-heading"><span className="eyebrow eyebrow-muted">HOW IT WORKS</span><h2>From idea to done.<br /><span>Without the stress.</span></h2></div><div className="how-steps"><article><span>01</span><div className="step-icon">✎</div><h3>Tell us what you need</h3><p>Describe your idea. No complicated forms or jargon.</p></article><article><span>02</span><div className="step-icon">⌕</div><h3>Find the right people</h3><p>Discover services and providers that fit your needs.</p></article><article><span>03</span><div className="step-icon">✦</div><h3>Make it happen</h3><p>Connect, plan, and move your project forward.</p></article></div></section>

      <section className="provider-cta"><div><span className="eyebrow">FOR SERVICE PROVIDERS</span><h2>Your skills deserve<br />to be discovered.</h2><p>Join DEPUKO and connect with people looking for what you do best.</p></div><a href="/register" className="button button-white">Offer your services <span>↗</span></a><div className="cta-decoration">✦</div></section>

      <footer className="site-footer"><a className="brand brand-footer" href="/"><span className="brand-mark">D</span><span>DEPUKO</span></a><span>Ideas meet people who make them real.</span><div><a href="/support">Help</a><a href="/login">Sign in</a><a href="/register">Join DEPUKO</a></div><small>© DEPUKO</small></footer>

      <button className="guide-launcher" onClick={() => setGuideOpen(v => !v)} aria-label="Open DEPUKO guide"><span>✦</span><b>Need help?</b></button>
      {guideOpen && <aside className="guide-panel" aria-label="DEPUKO guide"><div className="guide-head"><span className="guide-avatar">✦</span><div><b>DEPUKO guide</b><small>Guided help</small></div><button onClick={() => setGuideOpen(false)} aria-label="Close guide">×</button></div><div className="guide-body"><p>{guideMessage}</p><div className="guide-prompts"><button onClick={() => guide("Find a provider")}>Find a provider</button><button onClick={() => guide("Help me describe my project")}>Help describe my project</button><button onClick={() => guide("How DEPUKO works")}>How DEPUKO works</button></div></div><form className="guide-input" onSubmit={e => { e.preventDefault(); if (guideInput.trim()) { guide(`I need: ${guideInput.trim()}`); setGuideInput(""); } }}><input value={guideInput} onChange={e => setGuideInput(e.target.value)} placeholder="Tell us what you need…" aria-label="Message DEPUKO guide" /><button aria-label="Send message" disabled={!guideInput.trim()}>↑</button></form></aside>}
    </main>
  );
}
