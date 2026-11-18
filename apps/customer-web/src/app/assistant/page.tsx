"use client";

import { FormEvent, useState } from "react";
import { api, ApiError } from "../../lib/api";

type Service = { definitionId: string; domain: string; category: string; capabilities: string[]; type: string; configuration: Record<string, unknown> };
type Message = { id: number; role: "user" | "assistant"; text: string; results?: Service[] };

const starters = ["Create a promotional video", "Find someone to fix my home", "Design a logo", "Plan an event"];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", text: "Muraho! 👋 Tell me what you’re working on. I’ll help you search DEPUKO’s service catalog and shape your request." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(value = input) {
    const query = value.trim();
    if (!query || loading) return;
    const user: Message = { id: Date.now(), role: "user", text: query };
    setMessages(prev => [...prev, user]);
    setInput("");
    setLoading(true);
    try {
      const first = await api.searchServices(query);
      let found = first as Service[];
      if (!found.length) {
        const normalized = query.toLowerCase();
        const terms = normalized.includes("film") || normalized.includes("video") ? ["film", "video production", "videography", "film production", "video editing"]
          : normalized.includes("logo") || normalized.includes("design") ? ["logo design", "graphic design", "branding"]
          : normalized.includes("home") || normalized.includes("fix") || normalized.includes("repair") ? ["home repair", "plumbing", "electrician", "cleaning"]
          : normalized.includes("event") ? ["event planning", "catering", "decoration"] : [];
        if (terms.length) {
          const responses = await Promise.all(terms.map(term => api.searchServices(term).catch(() => [] as Service[])));
          found = responses.flat().filter((item, i, all) => all.findIndex(x => x.definitionId === item.definitionId) === i);
        }
      }
      const reply: Message = found.length
        ? { id: Date.now() + 1, role: "assistant", text: "I found " + found.length + " catalog match" + (found.length === 1 ? "" : "es") + ". Take a look below. These are published services only.", results: found }
        : { id: Date.now() + 1, role: "assistant", text: "I couldn’t find a published provider for “" + query + "” yet. The catalog may not have that service. Try a shorter keyword, browse categories, or request the service through Support. I can help you make the description clearer." };
      setMessages(prev => [...prev, reply]);
    } catch (error) {
      const text = error instanceof ApiError ? "Search is temporarily unavailable. Please try again in a moment." : "I couldn't reach DEPUKO right now. Check your connection and try again.";
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", text }]);
    } finally { setLoading(false); }
  }

  function submit(e: FormEvent) { e.preventDefault(); void send(); }

  return (
    <main className="assistant-page">
      <header className="assistant-top"><a className="brand" href="/"><span className="brand-mark">D</span><span>DEPUKO</span></a><a href="/" className="assistant-back">← Back to explore</a></header>
      <section className="assistant-shell">
        <div className="assistant-title"><span className="assistant-orb">✦</span><div><h1>Let's make your idea happen.</h1><p>Describe it naturally. We’ll search services and help you take the next step.</p></div></div>
        <div className="assistant-status"><span className="status-dot"/><span>Catalog matching</span><span className="status-divider">·</span><span>Guided assistant <b>(AI not connected yet)</b></span></div>
        <div className="chat-window" aria-live="polite">
          {messages.map(message => <div className={"chat-message " + message.role} key={message.id}><div className="chat-avatar">{message.role === "assistant" ? "✦" : "You"}</div><div className="chat-bubble"><p>{message.text}</p>{message.results && <div className="chat-results">{message.results.map(service => <article className="chat-result" key={service.definitionId}><span className="chat-result-icon">◈</span><div><b>{service.category}</b><small>{service.capabilities.join(" · ")}</small><small>{service.domain} · {service.type}</small></div></article>)}</div>}</div></div>)}
          {loading && <div className="chat-message assistant"><div className="chat-avatar">✦</div><div className="chat-bubble"><span className="typing-dots">Searching catalog…</span></div></div>}
        </div>
        {messages.length === 1 && <div className="starter-prompts"><span>Try one of these</span>{starters.map(s => <button key={s} onClick={() => void send(s)}>{s} <span>↗</span></button>)}</div>}
        <form className="assistant-compose" onSubmit={submit}><textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Describe what you need…" rows={2} aria-label="Describe what you need"/><button type="submit" disabled={loading || !input.trim()} aria-label="Send message">↑</button></form>
        <p className="assistant-footnote">This guided helper searches DEPUKO’s live service catalog. It doesn’t book or create an order automatically.</p>
      </section>
      <footer className="assistant-footer"><span>DEPUKO</span><span>Find people who make it happen.</span></footer>
    </main>
  );
}
