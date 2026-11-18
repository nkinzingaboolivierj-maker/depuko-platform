"use client";
/** Customer notifications (V7.4): in-app list from the backend. Email/SMS/push
 * providers are NOT CONFIGURED (owner credentials) - the page states that
 * honestly instead of pretending multi-channel delivery works. */
import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function Notifications() {
  const [items, setItems] = useState<{ id: string; text: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("depuko_session");
    fetch(`${BASE}/notifications`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async res => {
        if (!res.ok) throw new ApiError(res.status, res.statusText);
        return res.json();
      })
      .then((r: { notifications: { id: string; text: string }[] }) => setItems(r.notifications))
      .catch(e => setError(e instanceof ApiError ? `Failed (${e.status})` : "Network error"));
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Notifications</h1>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      {items?.length === 0 && <p>No notifications yet.</p>}
      <ul>{items?.map(n => <li key={n.id}>{n.text}</li>)}</ul>
      <p style={{ color: "#777", fontSize: 14 }}>In-app only. Email/SMS/push delivery is disabled until provider credentials are configured.</p>
    </main>
  );
}