/**
 * ブラウザ保存キャッシュ(stale-while-revalidate 用)。
 * 一度読んだ画面データを localStorage に残し、次回は待たずに即表示 → 裏で最新を確認する。
 * ユーザーごとにキーを分け、ログアウト時に全消去する。
 */
const PREFIX = 'buzzit-cache:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function readPersist<T>(uid: string | undefined, key: string): T | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${uid}:${key}`);
    if (!raw) return null;
    const j = JSON.parse(raw) as { t: number; v: T };
    if (Date.now() - j.t > MAX_AGE_MS) return null;
    return j.v;
  } catch {
    return null;
  }
}

export function writePersist(uid: string | undefined, key: string, value: unknown): void {
  if (!uid) return;
  try {
    localStorage.setItem(`${PREFIX}${uid}:${key}`, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // 容量超過時は古いキャッシュを消して1回だけ再試行
    try {
      pruneOld();
      localStorage.setItem(`${PREFIX}${uid}:${key}`, JSON.stringify({ t: Date.now(), v: value }));
    } catch {
      /* 保存できなくても動作には影響しない */
    }
  }
}

function pruneOld(): void {
  const items: Array<{ k: string; t: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(PREFIX)) continue;
    try { items.push({ k, t: (JSON.parse(localStorage.getItem(k) ?? '{}') as { t?: number }).t ?? 0 }); } catch { items.push({ k, t: 0 }); }
  }
  items.sort((a, b) => a.t - b.t).slice(0, Math.ceil(items.length / 2)).forEach((x) => localStorage.removeItem(x.k));
}

export function clearPersist(): void {
  try {
    const rm: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) rm.push(k);
    }
    rm.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
