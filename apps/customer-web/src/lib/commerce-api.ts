/** Commercial journey client (V7.3 section A): quotes, contracts, payments.
 * Every state shown comes from the backend - payment success is NEVER
 * fabricated: without a provider the API returns the honest disabled state. */
import { ApiError } from "./api";

// Reuse the shared client's fetch pipeline through api.* where defined; for
// new endpoints we go through the same underlying call helper:
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("depuko_session") : null;
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const commerce = {
  quotes: {
    mine: () => req<{ quotes: { id: string; status: string; totalCents: number }[] }>("/quotes"),
    detail: (id: string) => req<{ id: string; status: string; totalCents: number; lines: { label: string; amountCents: number }[] }>(`/quotes/${id}`),
    accept: (id: string) => req<{ id: string; status: string }>(`/quotes/${id}/accept`, { method: "POST" }),
  },
  contracts: {
    mine: () => req<{ contracts: { id: string; status: string; version: number }[] }>("/contracts"),
    detail: (id: string) => req<{ id: string; status: string; version: number; terms: Record<string, unknown>; signatures: number }>(`/contracts/${id}`),
    accept: (id: string) => req<{ contractId: string; status: string }>(`/contracts/${id}/sign`, { method: "POST" }),
  },
  payments: {
    initiate: (orderId: string, body: { amountCents: number; idempotencyKey: string }) =>
      req<{ intentId: string; status: string }>(`/payments/intents`, { method: "POST", body: JSON.stringify({ orderId, ...body }) }),
    status: (intentId: string) => req<{ status: string }>(`/payments/intents/${intentId}`),
    refunds: (intentId: string) => req<{ refunds: { id: string; status: string; amountCents: number }[] }>(`/payments/intents/${intentId}/refunds`),
    requestRefund: (intentId: string, amountCents: number, reason?: string) =>
      req<{ requested: boolean }>(`/payments/intents/${intentId}/refunds`, { method: "POST", body: JSON.stringify({ amountCents, reason }) }),
  },
};