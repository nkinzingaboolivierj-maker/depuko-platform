/** Admin API client - all calls remain permission-gated by the backend. */
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://depuko-api-production.up.railway.app/api/v1";

export async function adminCall<T>(path: string, token: string): Promise<T> {
  const response = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Admin call failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const adminApi = {
  balanceCheck: (token: string) => adminCall<{ checked: number; healthy: boolean; unbalanced: unknown[] }>("/finance/balance-check", token),
  integrationHealth: (token: string) => adminCall<{ kind: string; provider: string; enabled: boolean; credential_configured: boolean }[]>("/integrations/health", token),
  analyticsOrders: (token: string) => adminCall<{ status: string; count: string }[]>("/analytics/orders", token),
};