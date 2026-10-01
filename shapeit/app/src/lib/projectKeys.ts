export interface ProjectKey {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
}

const KEY = "shapeit:project-keys:v1";

export function listProjectKeys(): ProjectKey[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as ProjectKey[];
  } catch {
    return [];
  }
}

export function createProjectKey(name: string) {
  const item: ProjectKey = {
    id: crypto.randomUUID(),
    name,
    key: `pk_live_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
    enabled: true,
  };
  localStorage.setItem(KEY, JSON.stringify([item, ...listProjectKeys()]));
}

export function revokeProjectKey(id: string) {
  localStorage.setItem(
    KEY,
    JSON.stringify(listProjectKeys().map((k) => (k.id === id ? { ...k, enabled: false } : k))),
  );
}
