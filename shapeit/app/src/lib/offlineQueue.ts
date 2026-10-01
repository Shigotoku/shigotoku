import type { FeedbackSource } from "./types";

export interface QueueItem {
  id: string;
  rawText: string;
  pageUrl?: string;
  pageTitle?: string;
  screenshotDataUrl?: string;
  audioDataUrl?: string;
  source?: FeedbackSource;
}

const KEY = "shapeit:offline-queue:v1";

export function loadQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as QueueItem[];
  } catch {
    return [];
  }
}

export function enqueueOffline(item: Omit<QueueItem, "id"> & { id?: string }) {
  const next = [{ ...item, id: item.id || crypto.randomUUID() }, ...loadQueue()];
  localStorage.setItem(KEY, JSON.stringify(next.slice(0, 50)));
}

export function clearQueueItem(id: string) {
  localStorage.setItem(KEY, JSON.stringify(loadQueue().filter((i) => i.id !== id)));
}
