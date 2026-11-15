import { openDB } from "idb";

export type LocalSession = {
  id: string;
  title: string;
  createdAt: number;
  slides: { index: number; text: string; script: string }[];
};

// 端末内（IndexedDB）にのみ保存。サーバーには送らない。
const db = openDB("predeck", 1, {
  upgrade(d) {
    d.createObjectStore("sessions", { keyPath: "id" });
  },
});

export async function saveSession(s: LocalSession) {
  await (await db).put("sessions", s);
}
export async function listSessions(): Promise<LocalSession[]> {
  return (await (await db).getAll("sessions")).sort((a, b) => b.createdAt - a.createdAt);
}
export async function deleteSession(id: string) {
  await (await db).delete("sessions", id);
}
