/** Shared API client V7.2: adds organization/business endpoints used by the
 * workspace. Real fetches; honest errors; no fabricated data. */
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
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

export const api = {
  searchServices: (capability: string) => call<{ definitionId: string; domain: string; category: string; capabilities: string[]; type: string; configuration: Record<string, unknown> }[]>(`/services?capability=${encodeURIComponent(capability)}`),
  createOrder: (body: Record<string, unknown>) => call<{ id: string; status: string }>("/orders", { method: "POST", body: JSON.stringify(body) }),
  listMyOrders: () => call<{ orders: { id: string; status: string; priceCents: number }[] }>("/orders"),
  listBusinessOrders: () => call<{ orders: { id: string; status: string; priceCents: number }[] }>("/orders/business/mine"),
  confirmBusinessOrder: (id: string) => call<{ id: string; status: string }>(`/orders/${id}/business-confirm`, { method: "POST" }),
  cancelBusinessOrder: (id: string) => call<{ id: string; status: string }>(`/orders/${id}/business-cancel`, { method: "POST" }),
  confirmOrder: (id: string) => call<{ id: string; status: string }>(`/orders/${id}/confirm`, { method: "POST" }),
  cancelOrder: (id: string) => call<{ id: string; status: string }>(`/orders/${id}/cancel`, { method: "POST" }),
  register: (body: Record<string, unknown>) => call<{ sessionToken?: string }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: Record<string, unknown>) => call<{ sessionToken?: string }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  organization: {
    workspace: (orgId: string) => call<{ modules: string[] }>(`/organizations/${orgId}/workspace`),
    addBranch: (orgId: string, name: string, region: string) => call<{ created: boolean }>(`/organizations/${orgId}/branches`, { method: "POST", body: JSON.stringify({ name, region }) }),
    inviteMember: (orgId: string, userId: string, role: string) => call<{ invited: boolean }>(`/organizations/${orgId}/members`, { method: "POST", body: JSON.stringify({ userId, role }) }),
  },
  business: {
    register: (body: { templateId: string; legalName: string; country: string; industry: string }) => call<{ organizationId: string; status: string }>("/businesses/register", { method: "POST", body: JSON.stringify(body) }),
    templates: () => call<{ id: string; label: string }[]>("/businesses/templates"),
    onboarding: (orgId: string) => call<{ status: string; progress: number; missingRequired: string[] }>(`/businesses/${orgId}/onboarding`),
    answer: (orgId: string, fieldId: string, value: unknown) => call<{ saved: boolean; progress: number }>(`/businesses/${orgId}/onboarding/answers`, { method: "POST", body: JSON.stringify({ fieldId, value }) }),
    submit: (orgId: string) => call<{ status: string }>(`/businesses/${orgId}/onboarding/submit`, { method: "POST" }),
  },
  support: {
    openTicket: (category: string) => call<{ ticketId: string }>("/support/tickets", { method: "POST", body: JSON.stringify({ category }) }),
    getTicket: (id: string) => call<{ ticket: unknown; messages: { body: string }[] }>(`/support/tickets/${id}`),
    reply: (id: string, body: string) => call<{ sent: boolean }>(`/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  },
  reviews: {
    forSubject: (subjectId: string) => call<{ reviews: { quality: number; comment: string | null }[] }>(`/reviews/subjects/${subjectId}`),
  },
};