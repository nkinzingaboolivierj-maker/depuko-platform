/** Admin API client V7.2 - all calls permission-gated on the backend. */
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export async function adminCall<T>(path: string, token: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Admin call failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const adminApi = {
  balanceCheck: (token: string) => adminCall<{ checked: number; healthy: boolean; unbalanced: unknown[] }>("/finance/balance-check", token),
  integrationHealth: (token: string) => adminCall<{ kind: string; provider: string; enabled: boolean; credential_configured: boolean }[]>("/integrations/health", token),
  analyticsOrders: (token: string) => adminCall<{ status: string; count: string }[]>("/analytics/orders", token),
};