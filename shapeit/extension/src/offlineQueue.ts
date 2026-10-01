import type { ExtensionFeedbackPayload } from "./submitFeedback";

export type QueuedFeedback = ExtensionFeedbackPayload & {
  id: string;
  queuedAt: string;
  retries: number;
};

const QUEUE_KEY = "shapeitOfflineQueue";

export async function enqueueOffline(item: ExtensionFeedbackPayload): Promise<void> {
  const cur = await chrome.storage.local.get(QUEUE_KEY);
  const list = Array.isArray(cur[QUEUE_KEY]) ? (cur[QUEUE_KEY] as QueuedFeedback[]) : [];
  list.unshift({
    ...item,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    retries: 0,
  });
  await chrome.storage.local.set({ [QUEUE_KEY]: list.slice(0, 30) });
}

export async function listOfflineQueue(): Promise<QueuedFeedback[]> {
  const cur = await chrome.storage.local.get(QUEUE_KEY);
  return Array.isArray(cur[QUEUE_KEY]) ? (cur[QUEUE_KEY] as QueuedFeedback[]) : [];
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  const list = await listOfflineQueue();
  await chrome.storage.local.set({ [QUEUE_KEY]: list.filter((x) => x.id !== id) });
}
