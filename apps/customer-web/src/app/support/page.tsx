"use client";
/** Customer support: REAL ticket create + list messages. Internal notes
 * never reach this view (filtered in SQL). */
import { useState } from "react";
import { api, ApiError } from "../../lib/api";

export default function Support() {
  const [category, setCategory] = useState("general");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ body: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    try {
      const r = await api.support.openTicket(category);
      setTicketId(r.ticketId);
    } catch (e) {
      setError(e instanceof ApiError ? `Failed (${e.status})` : "Network error");
    }
  }

  async function load() {
    if (!ticketId) return;
    try {
      const r = await api.support.getTicket(ticketId);
      setMessages(r.messages);
    } catch (e) {
      setError(e instanceof ApiError ? `Failed (${e.status})` : "Network error");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Support</h1>
      <select value={category} onChange={e => setCategory(e.target.value)} aria-label="category">
        <option value="general">General</option>
        <option value="payments">Payments</option>
        <option value="quality">Work quality</option>
      </select>
      <button onClick={open}>Open ticket</button>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      {ticketId && <p>Ticket {ticketId} <button onClick={load}>Refresh</button></p>}
      <ul>{messages.map((m, i) => <li key={i}>{m.body}</li>)}</ul>
    </main>
  );
}