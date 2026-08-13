const KEY = "shapeit:rate:v1";
const WINDOW_MS = 60_000;
const MAX = 12;

export function checkCaptureRateLimit(): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  let stamps: number[] = [];
  try {
    stamps = (JSON.parse(localStorage.getItem(KEY) || "[]") as number[]).filter((t) => now - t < WINDOW_MS);
  } catch {
    stamps = [];
  }
  if (stamps.length >= MAX) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - stamps[0])) / 1000);
    return { ok: false, retryAfterSec };
  }
  stamps.push(now);
  localStorage.setItem(KEY, JSON.stringify(stamps));
  return { ok: true, retryAfterSec: 0 };
}
