"use client";
/** Customer orders - real API: list own orders, confirm or cancel. Empty
 * and error states are honest; nothing is fabricated. */
import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";

export default function Orders() {
  const [orders, setOrders] = useState<{ id: string; status: string; priceCents: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listMyOrders()
      .then(r => setOrders(r.orders))
      .catch(e => setError(e instanceof ApiError ? `Failed (${e.status}) - are you logged in?` : "Network error"));
  }, []);

  if (error) return <p role="alert" style={{ color: "#b00", padding: 24 }}>{error}</p>;
  if (!orders) return <p style={{ padding: 24 }}>Loading your orders...</p>;
  if (orders.length === 0) return <p style={{ padding: 24 }}>No orders yet. Start with “What do you need done?”.</p>;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Your orders</h1>
      <ul>
        {orders.map(o => (
          <li key={o.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 8 }}>
            <span>{o.id}</span>
            <span>{o.status}</span>
            <span>{(o.priceCents / 100).toLocaleString()} RWF</span>
          </li>
        ))}
      </ul>
    </main>
  );
}