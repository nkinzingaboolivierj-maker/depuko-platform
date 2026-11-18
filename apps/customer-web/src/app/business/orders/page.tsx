"use client";
/** Business operations (V7.3 section B): incoming orders with accept/start/
 * complete commands. Org-scoped by the backend; the workspace shows only
 * modules the business configuration grants this user. */
import { useEffect, useState } from "react";
import { api, ApiError } from "../../../lib/api";

export default function BusinessOrders() {
  const [orders, setOrders] = useState<{ id: string; status: string; priceCents: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setOrders((await api.listBusinessOrders()).orders); }
    catch (e) { setError(e instanceof ApiError ? `Failed (${e.status})` : "Network error"); }
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, cmd: "confirm" | "cancel") {
    try {
      await (cmd === "confirm" ? api.confirmBusinessOrder(id) : api.cancelBusinessOrder(id));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? `${cmd} failed (${e.status})` : "Network error");
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Business - Orders</h1>
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      <ul>
        {orders?.map(o => (
          <li key={o.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 8 }}>
            <span>{o.id}</span><span>{o.status}</span><span>{(o.priceCents / 100).toLocaleString()} RWF</span>
            {o.status === "pending_payment" && <button onClick={() => act(o.id, "confirm")}>Confirm</button>}
            {["pending_payment", "confirmed"].includes(o.status) && <button onClick={() => act(o.id, "cancel")}>Cancel</button>}
          </li>
        ))}
      </ul>
    </main>
  );
}