/**
 * バックログ一括実装用ドメイン（Inbox / 監査 / クーポン / 勝ち型 / ヘルス / 競合 / HPB）
 */
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getUserSettings, getMetrics, getPosts, getScheduledJobs, type UserSettings } from './firestore';
import { postToSlackWebhook } from './slack';
import { sendLinePush } from './lineMessaging';
import { generateRepurposeWithGemini } from './gemini';

function db() {
  return getFirestore();
}

function col(uid: string, name: string) {
  return db().collection(`users/${uid}/${name}`);
}

export async function writeAuditLog(
  uid: string,
  action: string,
  detail: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  await col(uid, 'auditLogs').add({
    action,
    detail,
    meta: meta ?? {},
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listAuditLogs(uid: string, limit = 50) {
  const snap = await col(uid, 'auditLogs').orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => {
    const data = d.data();
    const created =
      data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
    return { id: d.id, action: data.action, detail: data.detail, meta: data.meta ?? {}, createdAt: created };
  });
}

export interface IdeaInboxItem {
  id: string;
  text: string;
  author: string;
  authorRole?: string;
  photoDataUrl?: string | null;
  status: 'pending' | 'used' | 'archived';
  createdAt: string;
}

export async function addIdeaInbox(
  uid: string,
  input: { text: string; author?: string; authorRole?: string; photoDataUrl?: string | null },
): Promise<IdeaInboxItem> {
  const ref = await col(uid, 'ideaInbox').add({
    text: input.text.trim(),
    author: input.author ?? 'スタッフ',
    authorRole: input.authorRole ?? 'staff',
    photoDataUrl: input.photoDataUrl?.slice(0, 900_000) ?? null,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog(uid, 'idea_inbox.add', input.text.slice(0, 120));
  const settings = await getUserSettings(uid);
  if (settings.slackWebhookUrl) {
    await postToSlackWebhook(
      settings.slackWebhookUrl,
      `📥 *ネタInbox*\n${input.author ?? 'スタッフ'}: ${input.text.slice(0, 200)}\n👉 https://app.buzzit.shigotoku.com/inbox`,
    );
  }
  return {
    id: ref.id,
    text: input.text.trim(),
    author: input.author ?? 'スタッフ',
    authorRole: input.authorRole,
    photoDataUrl: input.photoDataUrl ?? null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

export async function listIdeaInbox(uid: string): Promise<IdeaInboxItem[]> {
  const snap = await col(uid, 'ideaInbox').orderBy('createdAt', 'desc').limit(40).get();
  return snap.docs.map((d) => {
    const data = d.data();
    const created =
      data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
    return {
      id: d.id,
      text: String(data.text ?? ''),
      author: String(data.author ?? ''),
      authorRole: data.authorRole as string | undefined,
      photoDataUrl: (data.photoDataUrl as string | null) ?? null,
      status: (data.status as IdeaInboxItem['status']) ?? 'pending',
      createdAt: created,
    };
  });
}

export async function markIdeaUsed(uid: string, id: string): Promise<IdeaInboxItem | null> {
  const ref = col(uid, 'ideaInbox').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const created =
    data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
  if (data.status !== 'used') {
    await ref.update({ status: 'used', usedAt: FieldValue.serverTimestamp() });
  }
  return {
    id,
    text: String(data.text ?? ''),
    author: String(data.author ?? ''),
    authorRole: data.authorRole as string | undefined,
    photoDataUrl: (data.photoDataUrl as string | null) ?? null,
    status: 'used',
    createdAt: created,
  };
}

export interface WinningPattern {
  id: string;
  title: string;
  hook: string;
  platform: string;
  notes?: string;
  sourcePostId?: string;
  createdAt: string;
}

export async function listWinningPatterns(uid: string): Promise<WinningPattern[]> {
  const snap = await col(uid, 'winningPatterns').orderBy('createdAt', 'desc').limit(30).get();
  return snap.docs.map((d) => {
    const data = d.data();
    const created =
      data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
    return {
      id: d.id,
      title: String(data.title ?? ''),
      hook: String(data.hook ?? ''),
      platform: String(data.platform ?? 'reels'),
      notes: data.notes as string | undefined,
      sourcePostId: data.sourcePostId as string | undefined,
      createdAt: created,
    };
  });
}

export async function addWinningPattern(
  uid: string,
  input: { title: string; hook: string; platform?: string; notes?: string; sourcePostId?: string },
): Promise<WinningPattern> {
  const ref = await col(uid, 'winningPatterns').add({
    title: input.title.trim(),
    hook: input.hook.trim(),
    platform: input.platform ?? 'reels',
    notes: input.notes ?? null,
    sourcePostId: input.sourcePostId ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog(uid, 'winning_pattern.add', input.title);
  return {
    id: ref.id,
    title: input.title.trim(),
    hook: input.hook.trim(),
    platform: input.platform ?? 'reels',
    notes: input.notes,
    sourcePostId: input.sourcePostId,
    createdAt: new Date().toISOString(),
  };
}

export interface CouponRecord {
  id: string;
  name: string;
  code: string;
  benefit: string;
  uses: number;
  maxUses?: number | null;
  active: boolean;
  createdAt: string;
}

export async function listCoupons(uid: string): Promise<CouponRecord[]> {
  const snap = await col(uid, 'coupons').orderBy('createdAt', 'desc').limit(40).get();
  return snap.docs.map((d) => {
    const data = d.data();
    const created =
      data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
    return {
      id: d.id,
      name: String(data.name ?? ''),
      code: String(data.code ?? ''),
      benefit: String(data.benefit ?? ''),
      uses: Number(data.uses ?? 0),
      maxUses: data.maxUses ?? null,
      active: data.active !== false,
      createdAt: created,
    };
  });
}

export async function createCoupon(
  uid: string,
  input: { name: string; code?: string; benefit: string; maxUses?: number },
): Promise<CouponRecord> {
  const code = (input.code?.trim() || `BZ${Date.now().toString(36).toUpperCase()}`).slice(0, 16);
  const ref = await col(uid, 'coupons').add({
    name: input.name.trim(),
    code,
    benefit: input.benefit.trim(),
    uses: 0,
    maxUses: input.maxUses ?? null,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog(uid, 'coupon.create', `${input.name} (${code})`);
  return {
    id: ref.id,
    name: input.name.trim(),
    code,
    benefit: input.benefit.trim(),
    uses: 0,
    maxUses: input.maxUses ?? null,
    active: true,
    createdAt: new Date().toISOString(),
  };
}

export async function redeemCoupon(uid: string, couponId: string, note?: string) {
  const ref = col(uid, 'coupons').doc(couponId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, message: 'クーポンが見つかりません' };
  const data = snap.data()!;
  if (data.active === false) return { success: false, message: '無効なクーポンです' };
  const uses = Number(data.uses ?? 0) + 1;
  if (data.maxUses && uses > Number(data.maxUses)) {
    return { success: false, message: '利用上限に達しています' };
  }
  await ref.update({ uses, lastRedeemedAt: new Date().toISOString() });
  await col(uid, 'couponRedemptions').add({
    couponId,
    note: note ?? '店頭で提示',
    createdAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog(uid, 'coupon.redeem', String(data.code), { uses });
  return { success: true, message: '来店利用を記録しました', uses };
}

export interface ChatQueueItem {
  id: string;
  lineUserId: string;
  displayName: string;
  preview: string;
  status: 'open' | 'done';
  createdAt: string;
}

export async function listChatQueue(uid: string): Promise<ChatQueueItem[]> {
  const snap = await col(uid, 'chatQueue').orderBy('createdAt', 'desc').limit(40).get();
  return snap.docs.map((d) => {
    const data = d.data();
    const created =
      data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();
    return {
      id: d.id,
      lineUserId: String(data.lineUserId ?? ''),
      displayName: String(data.displayName ?? 'LINEユーザー'),
      preview: String(data.preview ?? ''),
      status: (data.status as 'open' | 'done') ?? 'open',
      createdAt: created,
    };
  });
}

export async function enqueueChatNeedReply(
  uid: string,
  lineUserId: string,
  preview: string,
  displayName?: string,
): Promise<void> {
  const keywords = /クーポン|予約|空き|キャンセル|料金|値段|何時|営業/;
  if (!keywords.test(preview)) return;
  await col(uid, 'chatQueue').add({
    lineUserId,
    displayName: displayName ?? 'LINEユーザー',
    preview: preview.slice(0, 300),
    status: 'open',
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function resolveChatQueue(uid: string, id: string) {
  await col(uid, 'chatQueue').doc(id).update({ status: 'done', resolvedAt: FieldValue.serverTimestamp() });
}

export async function buildConnectionHealth(uid: string) {
  const settings = await getUserSettings(uid);
  const now = Date.now();
  const metaExpiry = settings.metaTokenExpiresAt ? new Date(settings.metaTokenExpiresAt).getTime() : null;
  const metaExpiringSoon = metaExpiry != null && metaExpiry - now < 7 * 24 * 60 * 60 * 1000;
  const metaExpired = metaExpiry != null && metaExpiry < now;

  const checks = [
    {
      id: 'meta',
      label: 'Instagram（Meta）連携',
      ok: !!(settings.metaAccessToken && settings.metaIgUserId) && !metaExpired,
      warn: metaExpiringSoon && !metaExpired,
      detail: metaExpired
        ? 'トークン期限切れ。設定から再連携してください'
        : metaExpiringSoon
          ? `トークン期限が近づいています（${settings.metaTokenExpiresAt}）`
          : settings.metaIgUserId
            ? '接続済み'
            : '未連携',
      ctaPath: '/settings',
    },
    {
      id: 'line_token',
      label: 'LINE Channel Access Token',
      ok: !!settings.lineChannelAccessToken,
      warn: false,
      detail: settings.lineChannelAccessToken ? '設定済み' : '未設定（配信・CRMが動きません）',
      ctaPath: '/settings',
    },
    {
      id: 'line_secret',
      label: 'LINE Webhook 署名（Channel Secret）',
      ok: !!settings.lineChannelSecret,
      warn: !!settings.lineChannelAccessToken && !settings.lineChannelSecret,
      detail: settings.lineChannelSecret
        ? '設定済み'
        : '未設定（Webhookのなりすまし防止が弱い状態）',
      ctaPath: '/settings',
    },
    {
      id: 'destination',
      label: '予約・来店URL',
      ok: !!settings.defaultDestinationUrl,
      warn: false,
      detail: settings.defaultDestinationUrl || '未設定',
      ctaPath: '/settings',
    },
    {
      id: 'slack',
      label: 'Slack 通知',
      ok: !!settings.slackWebhookUrl,
      warn: false,
      detail: settings.slackWebhookUrl ? 'Webhook設定済み' : '未設定（承認・失敗通知が届きません）',
      ctaPath: '/settings',
    },
    {
      id: 'gbp',
      label: 'Googleビジネスプロフィール',
      ok: !!settings.gbpConnected,
      warn: false,
      detail: settings.gbpConnected ? `接続中（${settings.gbpLocationName ?? '店舗'}）` : '未連携',
      ctaPath: '/settings',
    },
    {
      id: 'hpb',
      label: 'HPB / 予約トラッキング',
      ok: !!settings.hpbStoreUrl,
      warn: false,
      detail: settings.hpbStoreUrl || '未設定',
      ctaPath: '/settings',
    },
  ];

  const okCount = checks.filter((c) => c.ok).length;
  return {
    score: Math.round((okCount / checks.length) * 100),
    checks,
    alerts: checks.filter((c) => !c.ok || c.warn),
  };
}

export async function notifyApprovalNeeded(uid: string, jobId: string, summary: string): Promise<void> {
  const settings = await getUserSettings(uid);
  const text = `✅ *承認待ちの投稿があります*\n${summary.slice(0, 200)}\n👉 https://app.buzzit.shigotoku.com/calendar`;
  if (settings.slackWebhookUrl) await postToSlackWebhook(settings.slackWebhookUrl, text);
  if (settings.lineChannelAccessToken && settings.lineAdminUserId) {
    await sendLinePush(settings.lineChannelAccessToken, settings.lineAdminUserId, text.replace(/\*/g, ''));
  }
  await writeAuditLog(uid, 'schedule.approval_requested', summary.slice(0, 120), { jobId });
}

export async function listHpbConversions(uid: string) {
  const settings = await getUserSettings(uid);
  const snap = await col(uid, 'hpbConversions').orderBy('createdAt', 'desc').limit(20).get().catch(() => null);
  if (snap && !snap.empty) {
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        postId: d.id,
        title: String(data.title ?? '投稿'),
        reservations: Number(data.reservations ?? 0),
        estimatedRevenue: Number(data.estimatedRevenue ?? 0),
      };
    });
  }
  // 本番データが無い場合は投稿メトリクスから推計（Growth以上）
  if (!['growth', 'enterprise'].includes(settings.plan) || !settings.hpbStoreUrl) return [];
  const posts = await getPosts(uid);
  return posts
    .filter((p) => (p.lineSignups ?? 0) > 0 || (p.clicks ?? 0) > 3)
    .slice(0, 5)
    .map((p) => ({
      postId: p.id,
      title: p.title,
      reservations: Math.max(1, Math.round((p.lineSignups ?? 0) * 0.35 + (p.clicks ?? 0) * 0.05)),
      estimatedRevenue: p.revenue || Math.round(((p.lineSignups ?? 1) * 8000)),
    }));
}

export async function upsertHpbConversion(
  uid: string,
  input: { postId: string; title: string; reservations: number; estimatedRevenue: number },
) {
  await col(uid, 'hpbConversions').doc(input.postId).set(
    {
      title: input.title,
      reservations: input.reservations,
      estimatedRevenue: input.estimatedRevenue,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function draftGbpReviewReply(reviewText: string, plan: string) {
  const idea = `Googleマップの口コミへの返信文を1通作ってください。口コミ: ${reviewText}`;
  const { results, usedGemini } = await generateRepurposeWithGemini(idea, plan);
  const line = results.find((r) => r.platform === 'line') ?? results[0];
  return { reply: line?.content ?? 'ご来店いただきありがとうございます。またのお越しをお待ちしております。', usedGemini };
}

export function regionalWatchIdeas(industry?: string) {
  const base = [
    { topic: '同エリア「予約が埋まる理由」', hook: '【地元あるある】予約が取れない店の共通点3つ', score: 88 },
    { topic: '雨の日来店フック', hook: '雨の日こそ〇〇な理由（地域名入り）', score: 84 },
    { topic: '口コミ返信あるある', hook: '星3の口コミにこう返すと評価が戻る', score: 81 },
    { topic: '週末空き枠', hook: '土曜の15時だけ空いてます（地域限定）', score: 86 },
  ];
  if (industry === 'beauty') {
    base.unshift({ topic: '近隣サロンのカラー訴求', hook: '同じ駅前でも「持ちが良い店」と言われる言い方', score: 90 });
  }
  if (industry === 'food') {
    base.unshift({ topic: 'ランチ難民向け', hook: '駅から徒歩3分・並ばずに入れる理由', score: 90 });
  }
  return base.slice(0, 5);
}

export async function buildExportBundle(uid: string) {
  const [settings, tags, sources, steps, friends, patterns, coupons, posts, jobs, audit] = await Promise.all([
    getUserSettings(uid),
    col(uid, 'lineTags').get().then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    col(uid, 'lineSources').get().then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    col(uid, 'lineSteps').get().then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    col(uid, 'lineFriends').limit(2000).get().then((s) => s.docs.map((d) => d.data())),
    listWinningPatterns(uid),
    listCoupons(uid),
    getPosts(uid),
    getScheduledJobs(uid),
    listAuditLogs(uid, 100),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    plan: settings.plan,
    tags,
    sources,
    steps,
    friends,
    winningPatterns: patterns,
    coupons,
    posts,
    scheduled: jobs,
    auditLogs: audit,
  };
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}

export async function listStoreProgress(uid: string, storeIds: string[]) {
  // 簡易: ユーザー設定の接続状況を店舗横断の進捗として返す（同一アカウント多店舗想定）
  const settings = await getUserSettings(uid);
  const metrics = await getMetrics(uid);
  return storeIds.map((id) => ({
    storeId: id,
    metaConnected: !!(settings.metaAccessToken && settings.metaIgUserId),
    lineConnected: !!settings.lineChannelAccessToken,
    hasDestination: !!settings.defaultDestinationUrl,
    lineFriends: metrics.funnel.lineSignups,
    healthScore: metrics.healthScore,
  }));
}

export function assertCanApprove(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager' || role == null;
}

export type { UserSettings };
