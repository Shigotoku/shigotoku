export function canonicalizePageKey(url?: string | null): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.replace(/\/$/, "") || "/"}`;
  } catch {
    return url.split("?")[0] ?? "";
  }
}

export function encodePackId(key: string) {
  return btoa(unescape(encodeURIComponent(key)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function decodePackId(id: string) {
  try {
    const pad = id.replace(/-/g, "+").replace(/_/g, "/");
    const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return id;
  }
}

export function pageKeyLabel(key: string) {
  try {
    const u = new URL(key);
    return u.pathname || key;
  } catch {
    return key;
  }
}
