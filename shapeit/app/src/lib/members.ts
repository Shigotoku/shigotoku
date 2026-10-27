export interface DemoMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DemoProject {
  id: string;
  name: string;
}

const MEM_KEY = "shapeit:members:v1";
const PROJ_KEY = "shapeit:projects:v1";
const ACTIVE_KEY = "shapeit:active-project";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function listMembers(): DemoMember[] {
  const list = read<DemoMember[]>(MEM_KEY, []);
  if (list.length) return list;
  const seed = [{ id: "m1", name: "デモユーザー", email: "demo@shapeit.local", role: "owner" }];
  localStorage.setItem(MEM_KEY, JSON.stringify(seed));
  return seed;
}

export function inviteMember(email: string, role: string) {
  const list = listMembers();
  list.push({ id: crypto.randomUUID(), name: email.split("@")[0], email, role });
  localStorage.setItem(MEM_KEY, JSON.stringify(list));
}

export function removeMember(id: string) {
  localStorage.setItem(MEM_KEY, JSON.stringify(listMembers().filter((m) => m.id !== id)));
}

export function listProjects(): DemoProject[] {
  const list = read<DemoProject[]>(PROJ_KEY, []);
  if (list.length) return list;
  const seed = [{ id: "p1", name: "Default" }];
  localStorage.setItem(PROJ_KEY, JSON.stringify(seed));
  return seed;
}

export function upsertProject(name: string): DemoProject {
  const p = { id: crypto.randomUUID(), name };
  localStorage.setItem(PROJ_KEY, JSON.stringify([...listProjects(), p]));
  localStorage.setItem(ACTIVE_KEY, p.id);
  return p;
}

export function getActiveProjectId() {
  return localStorage.getItem(ACTIVE_KEY) || listProjects()[0]?.id || "p1";
}

export function setActiveProject(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}
