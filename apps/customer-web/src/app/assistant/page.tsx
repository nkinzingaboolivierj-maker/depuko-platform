"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { ThemeToggle } from "../../components/ThemeProvider";
import { WorkspaceIcon } from "../../components/WorkspaceIcon";

const AI_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";
type Service = { definitionId: string; domain: string; category: string; capabilities: string[]; type: string; configuration: Record<string, unknown> };
type Message = { id: number; role: "user" | "assistant"; text: string; results?: Service[] };
const starters = ["Create a promotional video", "Find someone to fix my home", "Design a logo", "Plan an event"];
const welcome: Message = { id: 1, role: "assistant", text: "Tell me what you need. I can help you explore services, shape a project and work out the next step." };

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("prompt");
    if (prompt) setInput(prompt);
  }, []);

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
      let aiText = "";
      try {
        const ai = await fetch(`${AI_BASE}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: query, history: messages.slice(-8).map(m => ({ role: m.role, content: m.text })) }),
        });
        if (ai.ok) {
          const payload = await ai.json();
          if (typeof payload.reply === "string") aiText = payload.reply;
        }
      } catch { /* Catalog search remains available if the AI service is offline. */ }
      const reply: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: aiText || (found.length
          ? "I found " + found.length + " catalog match" + (found.length === 1 ? "" : "es") + ". These are published services only. Tell me a little more about your requirements so I can help you prepare the next step."
          : "I couldn’t find a published provider for “" + query + "” yet. The catalog may not have that service. Try a shorter keyword, browse categories, or request the service through Support."),
        results: found.length ? found : undefined,
      };
      setMessages(prev => [...prev, reply]);
    } catch (error) {
      const text = error instanceof ApiError ? "Search is temporarily unavailable. Please try again in a moment." : "I couldn't reach DEPUKO right now. Check your connection and try again.";
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", text }]);
    } finally { setLoading(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(); }
  function newChat() { setMessages([{ ...welcome, id: Date.now() }]); setInput(""); }

  return (
    <main className="assistant-page">
      <header className="assistant-top"><a className="brand" href="/"><span className="brand-mark">D</span><span>DEPUKO</span></a><div className="assistant-top-actions"><ThemeToggle/><a href="/" className="assistant-back">Back to explore</a></div></header>
      <section className="assistant-shell">
        <div className="assistant-title">
          <span className="assistant-orb"><WorkspaceIcon name="sparkles" size={22}/></span>
          <div className="assistant-heading-copy"><h1>How can I help you today?</h1><p>Ask anything — I’ll help you find the right service and plan your next step.</p></div>
          <button className="assistant-new-chat" type="button" onClick={newChat}>New chat <WorkspaceIcon name="plus" size={15}/></button>
        </div>
        <div className="assistant-status"><span className="status-dot"/><span>DEPUKO AI</span><span className="status-divider">·</span><span>Catalog matching and AI guidance</span></div>
        <div className="chat-window" aria-live="polite">
          {messages.map(message => <div className={"chat-message " + message.role} key={message.id}><div className="chat-avatar">{message.role === "assistant" ? "D" : "You"}</div><div className="chat-bubble"><p>{message.text}</p>{message.results && <div className="chat-results">{message.results.map(service => <article className="chat-result" key={service.definitionId}><span className="chat-result-icon"><WorkspaceIcon name="briefcase" size={17}/></span><div><b>{service.category}</b><small>{service.capabilities.join(" · ")}</small><small>{service.domain} · {service.type}</small></div></article>)}</div>}</div></div>)}
          {loading && <div className="chat-message assistant"><div className="chat-avatar">D</div><div className="chat-bubble"><span className="typing-dots">Searching catalog…</span></div></div>}
        </div>
        {messages.length === 1 && <div className="starter-prompts"><span>Start with one of these</span>{starters.map(s => <button key={s} onClick={() => void send(s)}>{s} <span>↗</span></button>)}</div>}
        <form className="assistant-compose" onSubmit={submit}><textarea value={input} onChange={event => setInput(event.target.value)} placeholder="Type your message..." rows={2} aria-label="Type your message"/><button type="submit" disabled={loading || !input.trim()} aria-label="Send message"><WorkspaceIcon name="send" size={17}/></button></form>
        <p className="assistant-footnote">AI guidance and catalog discovery are separate from booking. This assistant does not create an order automatically.</p>
      </section>
      <footer className="assistant-footer"><span>DEPUKO</span><span>Find people who make it happen.</span></footer>
    </main>
  );
}
