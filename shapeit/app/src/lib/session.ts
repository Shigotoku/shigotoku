const KEY = "shapeit:session:touched";

export function touchSession() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearSessionTouch() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function isSessionExpired(timeoutMinutes: number): boolean {
  if (!timeoutMinutes || timeoutMinutes <= 0) return false;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const touched = Number(raw);
    if (!Number.isFinite(touched)) return false;
    return Date.now() - touched > timeoutMinutes * 60_000;
  } catch {
    return false;
  }
}
