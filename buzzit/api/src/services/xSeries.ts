/**
 * X シリーズ投稿（Sheets運用の Buzzit 移植）
 * - シリーズ＝カテゴリタブ相当の在庫キュー
 * - ルール＝曜日×時刻×件数＋ジッター
 * - 投稿OK（approved）かつ未投稿のみ消化
 */
import { createHash } from 'node:crypto';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { PublishMode } from '../types/schedule';
import { createScheduledJob, getUserSettings, type UserSettings } from './firestore';
import {
  credentialsFromSettings,
  postTweetWithXApi,
  truncateForX,
  X_FREE_MONTHLY_SOFT_LIMIT,
} from './xApi';
import { getXApiPostsThisMonth, incrementXApiPostCount } from './firestore';
import { executePublish } from './publish';

function db() {
  return getFirestore();
}

function col(uid: string, name: string) {
  return db().collection(`users/${uid}/${name}`);
}

export type XSeriesItemStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'skipped';

export interface XSeries {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  pendingCount?: number;
  approvedCount?: number;
}

export interface XSeriesItem {
  id: string;
  seriesId: string;
  text: string;
  tags?: string;
  title?: string;
  linkUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  approved: boolean;
  status: XSeriesItemStatus;
  publishedAt?: string;
  tweetId?: string;
  errorMessage?: string;
  createdAt: string;
  sortOrder: number;
}

export interface XScheduleRule {
  id: string;
  seriesId: string;
  seriesName?: string;
  days: string;
  timeHHMM: string;
  take: number;
  enabled: boolean;
  jitterMaxMin: number;
  publishMode: 'x_free' | 'notify';
  createdAt: string;
}

function tsToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return new Date().toISOString();
}

export async function listXSeries(uid: string): Promise<XSeries[]> {
  const snap = await col(uid, 'xSeries').orderBy('createdAt', 'desc').limit(40).get();
  const series = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data();
      const items = await col(uid, 'xSeries')
        .doc(d.id)
        .collection('items')
        .where('status', '==', 'pending')
        .limit(200)
        .get();
      let approvedCount = 0;
      for (const it of items.docs) {
        if (it.data().approved) approvedCount++;
      }
      return {
        id: d.id,
        name: String(data.name ?? ''),
        description: data.description as string | undefined,
        enabled: data.enabled !== false,
        createdAt: tsToIso(data.createdAt),
        pendingCount: items.size,
        approvedCount,
      } satisfies XSeries;
    }),
  );
  return series;
}

export async function createXSeries(
  uid: string,
  input: { name: string; description?: string },
): Promise<XSeries> {
  const name = input.name.trim();
  if (!name) throw new Error('シリーズ名が必要です');
  const ref = await col(uid, 'xSeries').add({
    name,
    description: input.description?.trim() ?? '',
    enabled: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return {
    id: ref.id,
    name,
    description: input.description?.trim(),
    enabled: true,
    createdAt: new Date().toISOString(),
    pendingCount: 0,
    approvedCount: 0,
  };
}

export async function updateXSeries(
  uid: string,
  seriesId: string,
  patch: { name?: string; description?: string; enabled?: boolean },
): Promise<XSeries | null> {
  const ref = col(uid, 'xSeries').doc(seriesId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.description !== undefined) updates.description = patch.description.trim();
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  await ref.update(updates);
  const list = await listXSeries(uid);
  return list.find((s) => s.id === seriesId) ?? null;
}

export async function deleteXSeries(uid: string, seriesId: string): Promise<boolean> {
  const ref = col(uid, 'xSeries').doc(seriesId);
  if (!(await ref.get()).exists) return false;
  const items = await ref.collection('items').limit(400).get();
  const batch = db().batch();
  for (const d of items.docs) batch.delete(d.ref);
  batch.delete(ref);
  const rules = await col(uid, 'xScheduleRules').where('seriesId', '==', seriesId).get();
  for (const d of rules.docs) batch.delete(d.ref);
  await batch.commit();
  return true;
}

function composeTweetText(item: {
  text: string;
  tags?: string;
  title?: string;
  linkUrl?: string;
}): string {
  const parts: string[] = [item.text.trim()];
  if (item.tags?.trim()) parts.push(item.tags.trim());
  if (item.title?.trim() || item.linkUrl?.trim()) {
    parts.push('');
    if (item.title?.trim()) parts.push(item.title.trim());
    if (item.linkUrl?.trim()) parts.push(item.linkUrl.trim());
  }
  return truncateForX(parts.join('\n'));
}

export async function listXSeriesItems(
  uid: string,
  seriesId: string,
  opts?: { status?: XSeriesItemStatus; limit?: number },
): Promise<XSeriesItem[]> {
  const limit = opts?.limit ?? 100;
  const snap = await col(uid, 'xSeries')
    .doc(seriesId)
    .collection('items')
    .orderBy('sortOrder', 'asc')
    .limit(Math.min(400, limit * 3))
    .get();
  let items = snap.docs.map((d) => mapItem(seriesId, d.id, d.data()));
  if (opts?.status) items = items.filter((i) => i.status === opts.status);
  return items.slice(0, limit);
}

function mapItem(seriesId: string, id: string, data: FirebaseFirestore.DocumentData): XSeriesItem {
  return {
    id,
    seriesId,
    text: String(data.text ?? ''),
    tags: data.tags as string | undefined,
    title: data.title as string | undefined,
    linkUrl: data.linkUrl as string | undefined,
    imageUrl: data.imageUrl as string | undefined,
    imageAlt: data.imageAlt as string | undefined,
    approved: !!data.approved,
    status: (data.status as XSeriesItemStatus) ?? 'pending',
    publishedAt: data.publishedAt as string | undefined,
    tweetId: data.tweetId as string | undefined,
    errorMessage: data.errorMessage as string | undefined,
    createdAt: tsToIso(data.createdAt),
    sortOrder: Number(data.sortOrder ?? 0),
  };
}

export async function addXSeriesItems(
  uid: string,
  seriesId: string,
  items: Array<{
    text: string;
    tags?: string;
    title?: string;
    linkUrl?: string;
    imageUrl?: string;
    imageAlt?: string;
    approved?: boolean;
  }>,
): Promise<XSeriesItem[]> {
  const seriesRef = col(uid, 'xSeries').doc(seriesId);
  if (!(await seriesRef.get()).exists) throw new Error('シリーズが見つかりません');

  const existing = await seriesRef.collection('items').orderBy('sortOrder', 'desc').limit(1).get();
  let sortOrder = existing.empty ? 0 : Number(existing.docs[0].data().sortOrder ?? 0) + 1;

  const created: XSeriesItem[] = [];
  const batch = db().batch();
  for (const item of items) {
    const text = item.text?.trim();
    if (!text) continue;
    const ref = seriesRef.collection('items').doc();
    const payload = {
      text,
      tags: item.tags?.trim() ?? '',
      title: item.title?.trim() ?? '',
      linkUrl: item.linkUrl?.trim() ?? '',
      imageUrl: item.imageUrl?.trim() ?? '',
      imageAlt: item.imageAlt?.trim() ?? '',
      approved: item.approved === true,
      status: 'pending' as const,
      sortOrder,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(ref, payload);
    created.push({
      id: ref.id,
      seriesId,
      text,
      tags: payload.tags,
      title: payload.title,
      linkUrl: payload.linkUrl,
      imageUrl: payload.imageUrl,
      imageAlt: payload.imageAlt,
      approved: payload.approved,
      status: 'pending',
      createdAt: new Date().toISOString(),
      sortOrder,
    });
    sortOrder++;
  }
  if (created.length) await batch.commit();
  return created;
}

export async function updateXSeriesItem(
  uid: string,
  seriesId: string,
  itemId: string,
  patch: Partial<{
    text: string;
    tags: string;
    title: string;
    linkUrl: string;
    imageUrl: string;
    imageAlt: string;
    approved: boolean;
    status: XSeriesItemStatus;
  }>,
): Promise<XSeriesItem | null> {
  const ref = col(uid, 'xSeries').doc(seriesId).collection('items').doc(itemId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of ['text', 'tags', 'title', 'linkUrl', 'imageUrl', 'imageAlt', 'approved', 'status'] as const) {
    if (patch[key] !== undefined) updates[key] = patch[key];
  }
  await ref.update(updates);
  const after = await ref.get();
  return mapItem(seriesId, itemId, after.data()!);
}

export async function deleteXSeriesItem(uid: string, seriesId: string, itemId: string): Promise<boolean> {
  const ref = col(uid, 'xSeries').doc(seriesId).collection('items').doc(itemId);
  if (!(await ref.get()).exists) return false;
  await ref.delete();
  return true;
}

export async function listXScheduleRules(uid: string): Promise<XScheduleRule[]> {
  const snap = await col(uid, 'xScheduleRules').orderBy('createdAt', 'desc').limit(80).get();
  const seriesSnap = await col(uid, 'xSeries').get();
  const nameById = new Map(seriesSnap.docs.map((d) => [d.id, String(d.data().name ?? '')]));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      seriesId: String(data.seriesId ?? ''),
      seriesName: nameById.get(String(data.seriesId ?? '')),
      days: String(data.days ?? ''),
      timeHHMM: String(data.timeHHMM ?? ''),
      take: Number(data.take ?? 1) || 1,
      enabled: data.enabled !== false,
      jitterMaxMin: Number(data.jitterMaxMin ?? 20),
      publishMode: (data.publishMode as 'x_free' | 'notify') ?? 'x_free',
      createdAt: tsToIso(data.createdAt),
    };
  });
}

export async function createXScheduleRule(
  uid: string,
  input: {
    seriesId: string;
    days: string;
    timeHHMM: string;
    take?: number;
    jitterMaxMin?: number;
    publishMode?: 'x_free' | 'notify';
  },
): Promise<XScheduleRule> {
  const series = await col(uid, 'xSeries').doc(input.seriesId).get();
  if (!series.exists) throw new Error('シリーズが見つかりません');
  const days = input.days.trim();
  const timeHHMM = normalizeHHMM(input.timeHHMM);
  if (!days || !timeHHMM) throw new Error('曜日と時刻が必要です');

  const ref = await col(uid, 'xScheduleRules').add({
    seriesId: input.seriesId,
    days,
    timeHHMM,
    take: Math.max(1, Math.min(5, Number(input.take ?? 1) || 1)),
    enabled: true,
    jitterMaxMin: Math.max(0, Math.min(60, Number(input.jitterMaxMin ?? 20))),
    publishMode: input.publishMode === 'notify' ? 'notify' : 'x_free',
    createdAt: FieldValue.serverTimestamp(),
  });
  return {
    id: ref.id,
    seriesId: input.seriesId,
    seriesName: String(series.data()?.name ?? ''),
    days,
    timeHHMM,
    take: Math.max(1, Math.min(5, Number(input.take ?? 1) || 1)),
    enabled: true,
    jitterMaxMin: Math.max(0, Math.min(60, Number(input.jitterMaxMin ?? 20))),
    publishMode: input.publishMode === 'notify' ? 'notify' : 'x_free',
    createdAt: new Date().toISOString(),
  };
}

export async function updateXScheduleRule(
  uid: string,
  ruleId: string,
  patch: Partial<{
    days: string;
    timeHHMM: string;
    take: number;
    enabled: boolean;
    jitterMaxMin: number;
    publishMode: 'x_free' | 'notify';
    seriesId: string;
  }>,
): Promise<XScheduleRule | null> {
  const ref = col(uid, 'xScheduleRules').doc(ruleId);
  if (!(await ref.get()).exists) return null;
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (patch.days !== undefined) updates.days = patch.days.trim();
  if (patch.timeHHMM !== undefined) updates.timeHHMM = normalizeHHMM(patch.timeHHMM);
  if (patch.take !== undefined) updates.take = Math.max(1, Math.min(5, patch.take));
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  if (patch.jitterMaxMin !== undefined) updates.jitterMaxMin = Math.max(0, Math.min(60, patch.jitterMaxMin));
  if (patch.publishMode !== undefined) updates.publishMode = patch.publishMode;
  if (patch.seriesId !== undefined) updates.seriesId = patch.seriesId;
  await ref.update(updates);
  const rules = await listXScheduleRules(uid);
  return rules.find((r) => r.id === ruleId) ?? null;
}

export async function deleteXScheduleRule(uid: string, ruleId: string): Promise<boolean> {
  const ref = col(uid, 'xScheduleRules').doc(ruleId);
  if (!(await ref.get()).exists) return false;
  await ref.delete();
  return true;
}

function normalizeHHMM(value: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (!m) return '';
  return `${Number(m[1])}:${m[2]}`;
}

/** GAS dailyJitterMinutes_ 相当（日×シリーズで安定したゆらぎ） */
export function dailyJitterMinutes(seriesId: string, date: Date, maxMin: number, step = 5): number {
  if (!maxMin) return 0;
  const key = `${seriesId}:${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const digest = createHash('sha1').update(key).digest();
  const n = digest.readUInt32BE(0);
  let raw = n % (maxMin + 1);
  if (step > 0) raw = Math.round(raw / step) * step;
  return raw;
}

export function matchScheduleDay(dayExpr: string, jst: Date): boolean {
  const w = ['日', '月', '火', '水', '木', '金', '土'][jst.getDay()];
  const d = dayExpr.replace(/[・,\s]/g, '').replace('〜', '~').replace('週末', '土日');
  if (d === '毎日') return true;
  if (d === '平日') return /[月火水木金]/.test(w);
  if (d === '土日') return /[土日]/.test(w);
  if (/^[日月火水木金土]+$/.test(d)) return d.includes(w);
  if (/^[日月火水木金土]~[日月火水木金土]$/.test(d)) {
    const order = '日月火水木金土';
    const si = order.indexOf(d[0]);
    const ei = order.indexOf(d[2]);
    const wi = order.indexOf(w);
    return si <= ei ? wi >= si && wi <= ei : wi >= si || wi <= ei;
  }
  return false;
}

export function shouldRunRuleNow(
  jst: Date,
  rule: { days: string; timeHHMM: string; seriesId: string; jitterMaxMin: number },
  toleranceMin = 3,
): boolean {
  if (!matchScheduleDay(rule.days, jst)) return false;
  const m = /^(\d{1,2}):(\d{2})$/.exec(rule.timeHHMM);
  if (!m) return false;
  const jitter = dailyJitterMinutes(rule.seriesId, jst, rule.jitterMaxMin, 5);
  const target = new Date(jst);
  target.setHours(Number(m[1]), Number(m[2]) + jitter, 0, 0);
  return Math.abs(jst.getTime() - target.getTime()) <= toleranceMin * 60 * 1000;
}

async function claimPendingItems(
  uid: string,
  seriesId: string,
  take: number,
): Promise<Array<{ id: string; data: FirebaseFirestore.DocumentData }>> {
  // status のみで取得し approved はアプリ側フィルタ（複合インデックス不要）
  const snap = await col(uid, 'xSeries')
    .doc(seriesId)
    .collection('items')
    .where('status', '==', 'pending')
    .orderBy('sortOrder', 'asc')
    .limit(Math.max(20, take * 10))
    .get();

  const candidates = snap.docs.filter((d) => d.data().approved === true);
  const claimed: Array<{ id: string; data: FirebaseFirestore.DocumentData }> = [];
  for (const doc of candidates) {
    if (claimed.length >= take) break;
    const locked = await db().runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists) return null;
      const data = fresh.data()!;
      if (data.status !== 'pending' || !data.approved) return null;
      tx.update(doc.ref, {
        status: 'publishing',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return data;
    });
    if (locked) claimed.push({ id: doc.id, data: locked });
  }
  return claimed;
}

async function publishSeriesItem(
  uid: string,
  settings: UserSettings,
  seriesId: string,
  itemId: string,
  data: FirebaseFirestore.DocumentData,
  mode: 'x_free' | 'notify',
): Promise<{ ok: boolean; message: string; tweetId?: string }> {
  const text = composeTweetText({
    text: String(data.text ?? ''),
    tags: data.tags as string | undefined,
    title: data.title as string | undefined,
    linkUrl: data.linkUrl as string | undefined,
  });
  const mediaUrls = data.imageUrl ? [String(data.imageUrl)] : undefined;
  const itemRef = col(uid, 'xSeries').doc(seriesId).collection('items').doc(itemId);

  if (mode === 'notify') {
    const outcome = await executePublish(
      uid,
      settings,
      'notify',
      [{ platform: 'x_thread', label: 'Xシリーズ', content: text }],
      new Date().toISOString(),
      mediaUrls,
    );
    const ok = outcome.status !== 'failed';
    await itemRef.update({
      status: ok ? 'published' : 'failed',
      publishedAt: ok ? new Date().toISOString() : FieldValue.delete(),
      errorMessage: ok ? FieldValue.delete() : outcome.message,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok, message: outcome.message };
  }

  const creds = credentialsFromSettings(settings);
  if (!creds) {
    await itemRef.update({
      status: 'failed',
      errorMessage: 'X API未設定',
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: false, message: 'X API未設定' };
  }
  if (getXApiPostsThisMonth(settings) >= X_FREE_MONTHLY_SOFT_LIMIT) {
    await itemRef.update({
      status: 'pending',
      errorMessage: '月次上限のためスキップ（次回再試行）',
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: false, message: '月次上限' };
  }

  const result = await postTweetWithXApi(creds, text, mediaUrls);
  if (result.success) {
    await incrementXApiPostCount(uid);
    await itemRef.update({
      status: 'published',
      publishedAt: new Date().toISOString(),
      tweetId: result.tweetId ?? null,
      errorMessage: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await createScheduledJob(uid, {
      contents: [{ platform: 'x_thread', label: 'Xシリーズ', content: text }],
      scheduledAt: new Date().toISOString(),
      publishMode: 'x_free' as PublishMode,
      status: 'published',
      mediaUrls,
    });
    return { ok: true, message: result.message, tweetId: result.tweetId };
  }

  await itemRef.update({
    status: 'failed',
    errorMessage: result.message,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: false, message: result.message };
}

/** 発火ログ（同ルール同ウィンドウの二重実行防止） */
async function alreadyFired(uid: string, ruleId: string, slotKey: string): Promise<boolean> {
  const ref = col(uid, 'xScheduleFires').doc(`${ruleId}_${slotKey}`);
  const snap = await ref.get();
  if (snap.exists) return true;
  await ref.set({ ruleId, slotKey, createdAt: FieldValue.serverTimestamp() });
  return false;
}

async function recoverStuckPublishing(uid: string, seriesId: string): Promise<void> {
  const snap = await col(uid, 'xSeries')
    .doc(seriesId)
    .collection('items')
    .where('status', '==', 'publishing')
    .limit(20)
    .get();
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const doc of snap.docs) {
    const updated = doc.data().updatedAt;
    const t = updated instanceof Timestamp ? updated.toDate().getTime() : 0;
    if (!t || t < cutoff) {
      await doc.ref.update({ status: 'pending', updatedAt: FieldValue.serverTimestamp() });
    }
  }
}

export async function processXSeriesSchedules(opts?: {
  onlyUid?: string;
  /** true でジッター／時刻判定を無視して即消化（手動実行用） */
  force?: boolean;
}): Promise<{ users: number; fired: number; posted: number; errors: number }> {
  const rulesSnap = await db().collectionGroup('xScheduleRules').where('enabled', '==', true).limit(200).get();
  const byUid = new Map<string, XScheduleRule[]>();

  for (const doc of rulesSnap.docs) {
    const uid = doc.ref.parent.parent?.id;
    if (!uid) continue;
    if (opts?.onlyUid && uid !== opts.onlyUid) continue;
    const data = doc.data();
    const rule: XScheduleRule = {
      id: doc.id,
      seriesId: String(data.seriesId ?? ''),
      days: String(data.days ?? ''),
      timeHHMM: String(data.timeHHMM ?? ''),
      take: Number(data.take ?? 1) || 1,
      enabled: true,
      jitterMaxMin: Number(data.jitterMaxMin ?? 20),
      publishMode: data.publishMode === 'notify' ? 'notify' : 'x_free',
      createdAt: tsToIso(data.createdAt),
    };
    const list = byUid.get(uid) ?? [];
    list.push(rule);
    byUid.set(uid, list);
  }

  let fired = 0;
  let posted = 0;
  let errors = 0;
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));

  for (const [uid, rules] of byUid) {
    const settings = await getUserSettings(uid);
    for (const rule of rules) {
      if (!opts?.force && !shouldRunRuleNow(jst, rule)) continue;
      const slotKey = opts?.force
        ? `force_${Date.now()}_${rule.id}`
        : `${jst.getFullYear()}${String(jst.getMonth() + 1).padStart(2, '0')}${String(jst.getDate()).padStart(2, '0')}_${rule.timeHHMM}`;
      if (!opts?.force && (await alreadyFired(uid, rule.id, slotKey))) continue;
      if (opts?.force) await alreadyFired(uid, rule.id, slotKey);

      const seriesSnap = await col(uid, 'xSeries').doc(rule.seriesId).get();
      if (!seriesSnap.exists || seriesSnap.data()?.enabled === false) continue;

      fired++;
      await recoverStuckPublishing(uid, rule.seriesId);
      const claimed = await claimPendingItems(uid, rule.seriesId, rule.take);
      if (!claimed.length) continue;

      for (const item of claimed) {
        const result = await publishSeriesItem(
          uid,
          settings,
          rule.seriesId,
          item.id,
          item.data,
          rule.publishMode,
        );
        if (result.ok) posted++;
        else errors++;
      }
    }
  }

  return { users: byUid.size, fired, posted, errors };
}

/** CSV（ヘッダー付き）インポート: 投稿OK,ツイートのコメント,タグ,タイトル,X用URL,画像ALT,画像URL */
export function parseSeriesCsv(csv: string): Array<{
  text: string;
  tags?: string;
  title?: string;
  linkUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  approved?: boolean;
}> {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const split = (line: string): string[] => {
    const cells: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cells.push(cur);
        cur = '';
      } else cur += ch;
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };

  const header = split(lines[0]).map((h) => h.toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const iOk = idx(['投稿ok', 'ok', 'approved']);
  const iText = idx(['ツイート', 'コメント', '本文', 'text']);
  const iTags = idx(['タグ', 'tag']);
  const iTitle = idx(['タイトル', 'title']);
  const iUrl = idx(['x用url', 'url', 'link']);
  const iAlt = idx(['画像alt', 'alt']);
  const iImg = idx(['画像url', 'image']);

  const out: Array<{
    text: string;
    tags?: string;
    title?: string;
    linkUrl?: string;
    imageUrl?: string;
    imageAlt?: string;
    approved?: boolean;
  }> = [];

  for (const line of lines.slice(1)) {
    const cells = split(line);
    const text = (iText >= 0 ? cells[iText] : cells[0])?.trim();
    if (!text) continue;
    const okRaw = iOk >= 0 ? cells[iOk] : '○';
    out.push({
      text,
      tags: iTags >= 0 ? cells[iTags] : undefined,
      title: iTitle >= 0 ? cells[iTitle] : undefined,
      linkUrl: iUrl >= 0 ? cells[iUrl] : undefined,
      imageAlt: iAlt >= 0 ? cells[iAlt] : undefined,
      imageUrl: iImg >= 0 ? cells[iImg] : undefined,
      approved: /^(○|〇|o|ok|true|1|はい)$/i.test(String(okRaw ?? '').trim()),
    });
  }
  return out;
}

/** 指定シリーズから承認済み未投稿を最大 take 件すぐ投稿 */
export async function publishSeriesNow(
  uid: string,
  seriesId: string,
  take = 1,
  mode: 'x_free' | 'notify' = 'x_free',
): Promise<{ posted: number; errors: number; messages: string[] }> {
  const settings = await getUserSettings(uid);
  const claimed = await claimPendingItems(uid, seriesId, take);
  const messages: string[] = [];
  let posted = 0;
  let errors = 0;
  for (const item of claimed) {
    const result = await publishSeriesItem(uid, settings, seriesId, item.id, item.data, mode);
    messages.push(result.message);
    if (result.ok) posted++;
    else errors++;
  }
  return { posted, errors, messages };
}

/** デフォルトの医療系テンプレシリーズ＋スケジュールを作成 */
export async function seedDefaultXSeriesPack(uid: string): Promise<{ series: XSeries[]; rules: XScheduleRule[] }> {
  const existing = await listXSeries(uid);
  if (existing.length > 0) return { series: existing, rules: await listXScheduleRules(uid) };

  const defs = [
    { name: 'A_論文', description: '信頼性・医師層向け（朝）', days: '月水木金', time: '7:30', take: 1 },
    { name: 'B_医療ニュース', description: '速報・解説', days: '毎日', time: '7:00', take: 1 },
    { name: 'C_医療あるある', description: '共感・拡散', days: '火木', time: '12:15', take: 1 },
    { name: 'D_自ブログ抜粋', description: 'ブログ流入', days: '火金', time: '19:00', take: 1 },
  ];

  const series: XSeries[] = [];
  const rules: XScheduleRule[] = [];
  for (const d of defs) {
    const s = await createXSeries(uid, { name: d.name, description: d.description });
    series.push(s);
    rules.push(
      await createXScheduleRule(uid, {
        seriesId: s.id,
        days: d.days,
        timeHHMM: d.time,
        take: d.take,
        jitterMaxMin: 20,
        publishMode: 'x_free',
      }),
    );
  }
  // ニュース夜枠
  const news = series.find((s) => s.name === 'B_医療ニュース');
  if (news) {
    rules.push(
      await createXScheduleRule(uid, {
        seriesId: news.id,
        days: '月木土',
        timeHHMM: '21:00',
        take: 1,
        jitterMaxMin: 20,
        publishMode: 'x_free',
      }),
    );
  }
  return { series, rules };
}
