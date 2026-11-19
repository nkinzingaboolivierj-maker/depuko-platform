"use client";
/** Business operations (V7.3 section B): incoming orders with accept/start/
 * complete commands. Org-scoped by the backend; the workspace shows only
 * modules the business configuration grants this user. */
import { useEffect, useState } from "react";
import { api, ApiError } from "../../../lib/api";
import { ThemeToggle } from "../../../components/ThemeProvider";

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
    <main className="workspace-page"><header className="workspace-header"><a className="workspace-brand" href="/"><span>D</span> DEPUKO</a><nav><a href="/business">Workspace</a><a href="/business/orders">Orders</a><a href="/business/services">Services</a><a href="/business/staff">Staff</a></nav><div className="workspace-header-actions"><ThemeToggle /><a className="workspace-logout" href="/login">Sign in</a></div></header><section className="workspace-heading"><span className="workspace-kicker">BUSINESS OPERATIONS</span><h1>Incoming orders</h1><p>Review and manage requests from customers.</p></section><section className="workspace-card">
      {error && <p role="alert" style={{ color: "#b00" }}>{error}</p>}
      <ul>
        {orders?.map(o => (
          <li key={o.id} className="workspace-order">
            <span>{o.id}</span><span>{o.status}</span><span>{(o.priceCents / 100).toLocaleString()} RWF</span>
            {o.status === "pending_payment" && <button onClick={() => act(o.id, "confirm")}>Confirm</button>}
            {["pending_payment", "confirmed"].includes(o.status) && <button onClick={() => act(o.id, "cancel")}>Cancel</button>}
          </li>
        ))}
      </ul>
      </section></main>
  );
}