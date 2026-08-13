export type AppRole = "owner" | "admin" | "member" | "viewer";

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const KEY = "shapeit:role:v1";

export function loadRole(): AppRole {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "owner" || v === "admin" || v === "member" || v === "viewer") return v;
  } catch {
    /* ignore */
  }
  return "owner";
}

export function saveRole(role: AppRole) {
  try {
    localStorage.setItem(KEY, role);
  } catch {
    /* ignore */
  }
}

export function canCapture(role: AppRole = loadRole()) {
  return role !== "viewer";
}

export function canTriage(role: AppRole = loadRole()) {
  return role === "owner" || role === "admin" || role === "member";
}

export function canEditIssue(role: AppRole = loadRole()) {
  return role === "owner" || role === "admin" || role === "member";
}

export function canManageSettings(role: AppRole = loadRole()) {
  return role === "owner" || role === "admin";
}
