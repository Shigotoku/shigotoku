import type { AppNotification } from "./types";

const KEY = "shapeit:notifications:v1";

export function listDemoNotifications(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as AppNotification[];
  } catch {
    return [];
  }
}

export function pushDemoNotification(
  input: Omit<AppNotification, "id" | "createdAt"> & { createdAt?: string },
): AppNotification {
  const item: AppNotification = {
    id: crypto.randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    uid: input.uid,
    title: input.title,
    body: input.body,
    read: input.read ?? false,
    href: input.href,
    kind: input.kind,
    weekKey: input.weekKey,
  };
  const list = [item, ...listDemoNotifications()].slice(0, 80);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("shapeit-notifications"));
  return item;
}

export function markDemoNotificationRead(id: string) {
  const list = listDemoNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("shapeit-notifications"));
}

export function markAllDemoNotificationsRead() {
  const list = listDemoNotifications().map((n) => ({ ...n, read: true }));
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("shapeit-notifications"));
}

export function countUnreadWeeklyDigestNotifications(): number {
  return listDemoNotifications().filter((n) => n.kind === "weekly_digest" && !n.read).length;
}
