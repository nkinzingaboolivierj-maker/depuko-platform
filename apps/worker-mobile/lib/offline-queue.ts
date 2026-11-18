/**
 * Safe offline queue (V7.2 directive): ONLY idempotent-by-design actions are
 * queued (accept/decline/checkout carry a clientRequestId so the server
 * dedupes). Non-idempotent actions (check-in) require connectivity - the UI
 * says so honestly instead of silently queueing. Sync status is shown
 * truthfully. No continuous location tracking is implemented - deliberate.
 */
import { AsyncStorage } from "react-native";

interface QueuedAction {
  clientRequestId: string;
  path: string;
  method: string;
  body?: unknown;
  queuedAt: number;
}

const KEY = "depuko_offline_queue_v1";

async function readQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
}

export const offlineQueue = {
  async enqueue(action: Omit<QueuedAction, "queuedAt">): Promise<void> {
    const q = await readQueue();
    if (q.some(a => a.clientRequestId === action.clientRequestId)) return; // dedupe
    q.push({ ...action, queuedAt: Date.now() });
    await writeQueue(q);
  },
  async pending(): Promise<QueuedAction[]> {
    return readQueue();
  },
  /** Drains the queue against the real API. Each action carries its
   * clientRequestId so the server-side idempotency prevents duplicates. */
  async sync(base: string, token: string): Promise<{ synced: number; failed: number }> {
    const q = await readQueue();
    let synced = 0;
    let failed = 0;
    const remaining: QueuedAction[] = [];
    for (const a of q) {
      try {
        const res = await fetch(base + a.path, {
          method: a.method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-client-request-id": a.clientRequestId },
          body: a.body ? JSON.stringify(a.body) : undefined,
        });
        if (res.ok) synced += 1;
        else if (res.status >= 500) { remaining.push(a); failed += 1; } // retryable
        else failed += 1; // 4xx: drop - server rejected deliberately
      } catch {
        remaining.push(a);
        failed += 1;
      }
    }
    await writeQueue(remaining);
    return { synced, failed };
  },
};