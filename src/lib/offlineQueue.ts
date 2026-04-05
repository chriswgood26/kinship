// Offline Queue — stores pending mutations during connectivity loss and replays them when back online.

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: string | null;
  headers: Record<string, string>;
  timestamp: number;
  label?: string; // human-readable description e.g. "Save encounter note"
}

const QUEUE_KEY = "kinship_offline_queue";

export function getQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

export function enqueueRequest(req: Omit<QueuedRequest, "id" | "timestamp">): QueuedRequest {
  const item: QueuedRequest = {
    ...req,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  const queue = getQueue();
  queue.push(item);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full — drop oldest item and retry
    queue.shift();
    queue.push(item);
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch { /* ignore */ }
  }
  return item;
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter((r) => r.id !== id);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

export function clearQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch { /* ignore */ }
}

export function queueSize(): number {
  return getQueue().length;
}
