const buckets = new Map<string, { count: number; resetAt: number }>();

/** インスタンス内メモリの簡易レート制限（本番は Cloud Armor / API Gateway 併用推奨） */
export function rateLimit(maxPerMinute: number) {
  return (uid: string | undefined): boolean => {
    if (!uid) return false;
    const now = Date.now();
    const key = uid;
    const row = buckets.get(key);
    if (!row || now > row.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (row.count >= maxPerMinute) return false;
    row.count += 1;
    return true;
  };
}
