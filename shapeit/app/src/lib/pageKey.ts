export function canonicalizePageKey(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const protocol = u.protocol === "http:" ? "https:" : u.protocol;
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${protocol}//${host}${path}`;
  } catch {
    return trimmed.split(/[?#]/)[0]?.replace(/\/$/, "") || "";
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
