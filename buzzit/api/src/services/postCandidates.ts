/**
 * 投稿候補（BuzzIt を SNS 投稿管理の正本にするための入れ物）。
 * - 管理ID（MD-001 等）をキーに、スプレッドシート/CSV から一括取り込み（再取り込みしても重複しない）
 * - 取り込みは「候補」として保存するだけ。下書き・予約・公開は一切作らない（既存の投稿・予約・シリーズは触らない）
 * - 列名は自由（ChatGPT 等が決めた列でよい）。既知の列は自動対応、未知の列は「追加項目」として保持
 * - 重複チェックはルールベースが基本。ユーザーが選べば AI（運営AI / 自分のAIキー）でも判定
 */
import { createHash } from 'node:crypto';
import { Router } from 'express';
import { getFirestore, FieldValue, FieldPath, Timestamp } from 'firebase-admin/firestore';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { aiFetch, aiKey, getAiSettings, withUserAi } from './aiClient';
import { AiQuotaError, assertPostQuota, consumeAiQuota, getAiUsage, incrementPostQuota } from './planLimits';
import { createScheduledJob, getScheduledJobs, getUserSettings } from './firestore';
import { getEffectiveSettings } from './personaSettings';
import { assertConnectedForPublishMode } from './schedulePublishSafety';
import { notifyApprovalNeeded } from './approvalNotify';
import { TARGET_PLATFORMS } from './crosspostRules';
import type { PublishMode } from '../types/schedule';
import { jobText, opCreateDraft, platformOf, type AgentCtx } from './agentApi';
import { parseCsv } from './agentExtras';
import { listIdeaInbox, writeAuditLog } from './productExtras';
import { assertPersonaAccess, getPersona, personaRequiresApproval, resolveActivePersonaId } from './personas';
import {
  buildAiDupPrompt,
  findDuplicates,
  mergeAiVerdicts,
  keywords,
  normalize,
  parseAiVerdicts,
  type DupItem,
  type DupMatch,
  type DupTarget,
} from './dupCheck';

const db = () => getFirestore();
const col = (uid: string) => db().collection(`users/${uid}/postCandidates`);

/**
 * 読み取りコスト対策: 候補の全件読み込み(最大2000件)と重複チェック用の比較対象(候補+予約+シリーズ在庫+ネタ帳)は、
 * 画面操作のたびに全件読むと課金・遅延が大きいので、短時間だけインスタンス内にキャッシュする。書き込み時は即破棄する。
 */
const CACHE_TTL_MS = 20_000;
const listCache = new Map<string, { at: number; list: Candidate[] }>();
const poolCache = new Map<string, { at: number; key: string; pool: DupItem[] }>();
const lastSync = new Map<string, number>();
const SYNC_MIN_INTERVAL_MS = 5 * 60_000;
const countsCache = new Map<string, { at: number; v: CandidateCounts }>();
/** 候補に変更があるたびに更新する「版」。画面は前回の版を送り、同じなら中身を送り直さない(読み取り1回で済む) */
const versionDoc = (uid: string) => db().doc(`users/${uid}/prefs/candidatesVersion`);
const bust = (uid: string) => {
  listCache.delete(uid); poolCache.delete(uid); countsCache.delete(uid);
  void versionDoc(uid).set({ v: String(Date.now()) }).catch(() => undefined);
};
async function candidatesVersion(uid: string): Promise<string> {
  const snap = await versionDoc(uid).get();
  const v = snap.data()?.v as string | undefined;
  if (v) return v;
  const created = String(Date.now());
  await versionDoc(uid).set({ v: created }).catch(() => undefined);
  return created;
}

// ---- 規模対策: 全件を読まずに済むための仕組み ----
//  ・一覧はFirestoreのクエリ(絞り込み+ページ送り)で必要な分だけ読む
//  ・件数は集計クエリ(count)で数える(ドキュメントを読まない)
//  ・類似投稿チェックは、各候補に持たせた「指紋」(fp/fpk)で似ていそうな候補だけを検索して比べる
//  ・シリーズ名の一覧は小さな専用ドキュメントに持つ
const h8 = (x: string) => createHash('sha1').update(x).digest('hex').slice(0, 8);
const SKETCH = 24;
/** 本文の2文字の並び(類似判定と同じ尺度)と主要語から、似た投稿を探すための指紋を作る */
export function fingerprint(title: string, body: string, theme = ''): { fp: string[]; fpk: string[] } {
  const nt = normalize(body || title);
  const bg = new Set<string>();
  for (let i = 0; i < nt.length - 1; i++) bg.add(h8(nt.slice(i, i + 2)));
  const fp = [...bg].sort().slice(0, SKETCH);
  const fpk = [...keywords(`${title} ${theme} ${body}`)].map(h8).sort().slice(0, SKETCH);
  return { fp, fpk };
}

export interface CandidateCounts {
  all: number;
  counts: Record<string, number>;
  statusCounts: Record<string, number>;
  platformCounts: Record<string, number>;
}
const PLATFORM_IDS = TARGET_PLATFORMS as string[];

/** 件数だけを集計クエリで数える(ドキュメントは読まない)。20秒キャッシュ */
export async function candidateCounts(uid: string): Promise<CandidateCounts> {
  const hit = countsCache.get(uid);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.v;
  const n = async (q: FirebaseFirestore.Query) => (await q.count().get()).data().count;
  const base = col(uid);
  const sels = Object.keys(SELECTION_LABEL);
  const stats = Object.keys(STATUS_LABEL);
  const [all, selN, statN, platN] = await Promise.all([
    n(base),
    Promise.all(sels.map((k) => n(base.where('selection', '==', k)))),
    Promise.all(stats.map((k) => n(base.where('status', '==', k)))),
    Promise.all(PLATFORM_IDS.map((k) => n(base.where('platform', '==', k)))),
  ]);
  const counts: Record<string, number> = { all };
  sels.forEach((k, i) => { counts[k] = selN[i]; });
  const statusCounts: Record<string, number> = {};
  stats.forEach((k, i) => { statusCounts[k] = statN[i]; });
  const platformCounts: Record<string, number> = {};
  let withPlatform = 0;
  PLATFORM_IDS.forEach((k, i) => { platformCounts[k] = platN[i]; withPlatform += platN[i]; });
  platformCounts.none = Math.max(0, all - withPlatform);
  const v = { all, counts, statusCounts, platformCounts };
  countsCache.set(uid, { at: Date.now(), v });
  if (countsCache.size > 200) countsCache.delete(countsCache.keys().next().value as string);
  return v;
}

const seriesDoc = (uid: string) => db().doc(`users/${uid}/prefs/candidateSeries`);
const ensured = new Set<string>();
/** シリーズ名の一覧(専用ドキュメント)。無ければ一度だけ全件から作る */
export async function getSeriesNames(uid: string): Promise<string[]> {
  const snap = await seriesDoc(uid).get();
  if (snap.exists) return ((snap.data()?.names as string[]) ?? []).slice().sort();
  const names = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 40; page++) {
    let q = col(uid).orderBy(FieldPath.documentId()).select('series').limit(1000);
    if (cursor) q = q.startAfter(cursor);
    const r = await q.get();
    for (const d of r.docs) { const v = d.data().series; if (v) names.add(String(v)); }
    if (r.size < 1000) break;
    cursor = r.docs[r.size - 1].id;
  }
  await seriesDoc(uid).set({ names: [...names].slice(0, 500) });
  return [...names].sort();
}
const addSeriesNames = async (uid: string, names: Array<string | undefined>) => {
  const list = [...new Set(names.map((x) => (x ?? '').trim()).filter(Boolean))];
  if (!list.length) return;
  await seriesDoc(uid).set({ names: FieldValue.arrayUnion(...list) }, { merge: true }).catch(() => undefined);
};

/** 指紋が無い古い候補に、一度だけ指紋を付ける(以後の新規・更新は書き込み時に付く) */
async function ensureFingerprints(uid: string) {
  if (ensured.has(uid)) return;
  const flag = db().doc(`users/${uid}/prefs/candidateFp`);
  if ((await flag.get()).exists) { ensured.add(uid); return; }
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    let q = col(uid).orderBy(FieldPath.documentId()).limit(400);
    if (cursor) q = q.startAfter(cursor);
    const r = await q.get();
    const b = db().batch();
    let w = 0;
    for (const d of r.docs) {
      const x = d.data();
      if (Array.isArray(x.fp)) continue;
      b.update(d.ref, fingerprint(String(x.title ?? ''), String(x.body ?? ''), String(x.theme ?? '')));
      w++;
    }
    if (w) await b.commit();
    if (r.size < 400) break;
    cursor = r.docs[r.size - 1].id;
  }
  await flag.set({ done: true, at: new Date().toISOString() });
  ensured.add(uid);
}

async function loadAllCandidates(uid: string): Promise<Candidate[]> {
  const hit = listCache.get(uid);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.list;
  const list: Candidate[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    let q = col(uid).orderBy(FieldPath.documentId()).limit(1000);
    if (cursor) q = q.startAfter(cursor);
    const r = await q.get();
    for (const d of r.docs) list.push(fromDoc(d.id, d.data()));
    if (r.size < 1000) break;
    cursor = r.docs[r.size - 1].id;
  }
  listCache.set(uid, { at: Date.now(), list });
  if (listCache.size > 100) listCache.delete(listCache.keys().next().value as string);
  return list;
}

export type Selection = 'unreviewed' | 'adopted' | 'needs_fix' | 'hold' | 'rejected';
export const SELECTION_LABEL: Record<Selection, string> = {
  unreviewed: '未選定',
  adopted: '採用',
  needs_fix: '要修正',
  hold: '保留',
  rejected: '不採用',
};
export type CandidateStatus = 'candidate' | 'drafted' | 'scheduled' | 'published';
export const STATUS_LABEL: Record<CandidateStatus, string> = { candidate: '候補', drafted: '下書き', scheduled: '予約済み', published: '投稿済み' };

/** 媒体(SNS)の表記ゆれを、内部ID（x_thread / instagram / facebook / threads / line / gbp / youtube_shorts / tiktok）にそろえる */
export function toPlatform(raw: string): string {
  const s = (raw ?? '').normalize('NFKC').toLowerCase().replace(/\s/g, '');
  if (!s) return '';
  if (/instagram|インスタ|^ig$|リール/.test(s)) return 'instagram';
  if (/tiktok|ティックトック/.test(s)) return 'tiktok';
  if (/youtube|ユーチューブ|ショート|shorts/.test(s)) return 'youtube_shorts';
  if (/threads|スレッズ/.test(s)) return 'threads';
  if (/facebook|フェイスブック|^fb$/.test(s)) return 'facebook';
  if (/line|ライン/.test(s)) return 'line';
  if (/gbp|googleビジネス|ビジネスプロフィール|マップ|google/.test(s)) return 'gbp';
  if (/twitter|ツイッター|ツイート|x_thread|^x/.test(s)) return 'x_thread';
  return '';
}
/** 内部ID(x_thread 等)でも表記ゆれ(X・インスタ 等)でも、内部IDにそろえる */
export const normPlatform = (raw: string): string => ((TARGET_PLATFORMS as string[]).includes(raw) ? raw : toPlatform(raw));
export const PLATFORM_LABEL: Record<string, string> = { x_thread: 'X', instagram: 'Instagram', facebook: 'Facebook', threads: 'Threads', line: 'LINE', gbp: 'Googleビジネス', youtube_shorts: 'YouTube Shorts', tiktok: 'TikTok' };

export interface Candidate {
  id: string;
  managementId: string;
  series: string;
  title: string;
  body: string;
  imageIdea: string;
  rating: string;
  selection: Selection;
  selectionRaw: string;
  /** 投稿先の媒体（内部ID）。空=媒体未設定 */
  platform: string;
  /** 候補の出どころ: import(取り込み) / manual(自分で書いた) / idea(ネタ帳) / xseries(Xシリーズ在庫) / draft(カレンダーの下書き) */
  source: string;
  sourceKey?: string;
  scheduledAt?: string;
  checkNotes: string;
  editNotes: string;
  theme: string;
  conclusion: string;
  punchline: string;
  /** 取り込んだ元の列のうち、既知の項目に当てはまらなかったもの（列名は自由） */
  extra: Record<string, string>;
  /** 投稿に付ける画像・動画のURL（https）。投稿には画像が必須 */
  mediaUrls: string[];
  status: CandidateStatus;
  linkedJobId?: string;
  aiSuggestion?: string;
  createdAt: string;
  updatedAt: string;
}

const TEXT_FIELDS = ['series', 'title', 'body', 'imageIdea', 'rating', 'checkNotes', 'editNotes', 'theme', 'conclusion', 'punchline'] as const;
type TextField = (typeof TEXT_FIELDS)[number];
type FieldKey = TextField | 'managementId' | 'selection' | 'platform';

export const FIELD_LABEL: Record<FieldKey, string> = {
  managementId: '管理ID',
  series: 'シリーズ',
  title: 'タイトル',
  body: '投稿本文',
  imageIdea: '画像案',
  rating: '評価',
  selection: '選定状況',
  platform: '媒体',
  checkNotes: '確認事項',
  editNotes: '編集メモ',
  theme: 'テーマ',
  conclusion: '結論',
  punchline: 'オチ',
};

/** 列名の別名（正規化済みの完全一致を優先し、次に部分一致）。ここにない列は「追加項目」として残る */
const ALIASES: Record<FieldKey, string[]> = {
  managementId: ['管理id', 'id', 'no', '番号', '管理番号', 'コード', 'code'],
  body: ['投稿本文', '本文', 'body', 'text', '投稿文', 'ツイート', '文章', 'コメント', 'content'],
  title: ['タイトル', 'title', '題名', '見出し', '企画名', '企画'],
  series: ['シリーズ', 'series', 'カテゴリ', '分類', 'category'],
  imageIdea: ['画像案', '画像', 'イメージ', 'image', 'ビジュアル', '4コマ'],
  rating: ['評価', 'rating', 'スコア', '点数', 'おすすめ度'],
  selection: ['選定状況', '選定', '状況', 'ステータス', 'status', '採否'],
  platform: ['媒体', 'sns', 'プラットフォーム', 'platform', '投稿先', '投稿媒体', 'チャンネル'],
  checkNotes: ['確認事項', '確認', '要確認', '注意', 'チェック'],
  editNotes: ['編集メモ', 'メモ', '備考', 'notes', 'note', '修正メモ'],
  punchline: ['4コマのオチ', 'オチ', '落ち', 'punchline'],
  conclusion: ['結論', '要点', '主張', 'conclusion'],
  theme: ['テーマ', 'theme', 'トピック'],
};
const MATCH_ORDER: FieldKey[] = ['managementId', 'body', 'title', 'series', 'punchline', 'conclusion', 'theme', 'imageIdea', 'rating', 'selection', 'platform', 'checkNotes', 'editNotes'];

const normHeader = (h: string) => h.normalize('NFKC').toLowerCase().replace(/[\s\u3000_\-・:：()（）]/g, '');

export type ColumnMap = Record<string, FieldKey | 'extra' | 'ignore'>;

/** ヘッダー行 → 項目の対応。columnMap（列名→項目）が優先。 */
export function mapHeaders(headers: string[], override: ColumnMap = {}): Array<FieldKey | 'extra' | 'ignore'> {
  const taken = new Set<FieldKey>();
  const out: Array<FieldKey | 'extra' | 'ignore'> = headers.map((h) => {
    const o = override[h];
    if (o) {
      if (o !== 'extra' && o !== 'ignore') taken.add(o);
      return o;
    }
    return 'extra';
  });
  const hs = headers.map(normHeader);
  for (const pass of ['exact', 'partial'] as const) {
    for (const f of MATCH_ORDER) {
      if (taken.has(f)) continue;
      const aliases = ALIASES[f].map(normHeader);
      const idx = hs.findIndex((h, i) => out[i] === 'extra' && !override[headers[i]] && h && !MEDIA_HEADERS.has(h) && aliases.some((a) => (pass === 'exact' ? h === a : a.length >= (/^[a-z0-9]+$/.test(a) ? 4 : 2) && h.includes(a))));
      if (idx >= 0) {
        out[idx] = f;
        taken.add(f);
      }
    }
  }
  return out;
}

export function toSelection(raw: string): Selection {
  const s = (raw ?? '').normalize('NFKC').toLowerCase().replace(/\s/g, '');
  if (!s) return 'unreviewed';
  if (/不採用|却下|ボツ|ng|×|没|見送/.test(s)) return 'rejected';
  if (/要修正|修正|直し|要確認|リライト/.test(s)) return 'needs_fix';
  if (/保留|検討|hold|△|後で/.test(s)) return 'hold';
  if (/採用|採択|ok|○|◎|決定|選定済/.test(s)) return 'adopted';
  return 'unreviewed';
}

const docIdOf = (managementId: string) => managementId.replace(/[\/\\\s#?\[\]*]/g, '_').slice(0, 100) || 'x';
const clean = (v: unknown, max = 5000) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

/** https の URL だけを残す（最大6件） */
export function cleanUrls(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\s,|]+/) : [];
  return [...new Set(arr.map((u) => String(u ?? '').trim()).filter((u) => /^https:\/\/\S+$/.test(u)))].slice(0, 6);
}
const MEDIA_HEADERS = new Set(['画像url', '画像urls', 'imageurl', 'imageurls', 'mediaurl', 'mediaurls', '画像リンク']);

function tsIso(v: unknown): string {
  return v instanceof Timestamp ? v.toDate().toISOString() : new Date().toISOString();
}

function fromDoc(id: string, d: FirebaseFirestore.DocumentData): Candidate {
  return {
    id,
    managementId: d.managementId ?? id,
    series: d.series ?? '',
    title: d.title ?? '',
    body: d.body ?? '',
    imageIdea: d.imageIdea ?? '',
    rating: d.rating ?? '',
    selection: (d.selection as Selection) ?? 'unreviewed',
    selectionRaw: d.selectionRaw ?? '',
    platform: d.platform ?? '',
    source: d.source ?? 'import',
    sourceKey: d.sourceKey,
    scheduledAt: d.scheduledAt,
    checkNotes: d.checkNotes ?? '',
    editNotes: d.editNotes ?? '',
    theme: d.theme ?? '',
    conclusion: d.conclusion ?? '',
    punchline: d.punchline ?? '',
    extra: (d.extra as Record<string, string>) ?? {},
    mediaUrls: cleanUrls(d.mediaUrls),
    status: (d.status as CandidateStatus) ?? 'candidate',
    linkedJobId: d.linkedJobId,
    aiSuggestion: d.aiSuggestion,
    createdAt: tsIso(d.createdAt),
    updatedAt: tsIso(d.updatedAt),
  };
}

// ---- 取り込み ----

export interface ImportInput {
  csv?: string;
  /** 表の行（列名は自由）。MCP/ChatGPT からはこちらを使う */
  rows?: Array<Record<string, unknown>>;
  columnMap?: ColumnMap;
  /** skip=既存の管理IDは触らない（既定） / update=内容を更新（選定状況・状態は人の判断を保持） */
  mode?: 'skip' | 'update';
  /** true=保存せず結果だけ返す。既定 true にする呼び出し側も多い */
  dryRun?: boolean;
  /** true=媒体（投稿先SNS）が読み取れない行は取り込まない（AI経由は必須） */
  requirePlatform?: boolean;
}

const MAX_ROWS = 2000;

export async function importCandidates(uid: string, input: ImportInput) {
  let headers: string[] = [];
  let records: string[][] = [];
  if (input.csv?.trim()) {
    if (input.csv.length > 2_000_000) throw new Error('データが大きすぎます（2MBまで）');
    const t = parseCsv(input.csv);
    if (t.length < 2) throw new Error('見出し行とデータ行が必要です');
    headers = t[0].map((h) => h.trim());
    records = t.slice(1);
  } else if (input.rows?.length) {
    const hs: string[] = [];
    for (const r of input.rows) for (const k of Object.keys(r)) if (!hs.includes(k)) hs.push(k);
    headers = hs;
    records = input.rows.map((r) => hs.map((h) => String(r[h] ?? '')));
  } else {
    throw new Error('csv か rows が必要です');
  }
  if (records.length > MAX_ROWS) throw new Error(`一度に取り込めるのは${MAX_ROWS}行までです`);

  const mapping = mapHeaders(headers, input.columnMap);
  if (!mapping.includes('body') && !mapping.includes('title')) {
    throw new Error('投稿本文またはタイトルに当たる列が見つかりません（columnMap で列を指定してください）');
  }
  const mode = input.mode === 'update' ? 'update' : 'skip';

  type Parsed = { managementId: string; auto: boolean; fields: Partial<Record<TextField, string>>; selectionRaw: string; platform: string; mediaUrls: string[]; extra: Record<string, string>; rowNo: number };
  const parsed: Parsed[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  const seen = new Set<string>();
  records.forEach((rec, i) => {
    const rowNo = i + 2;
    const fields: Partial<Record<TextField, string>> = {};
    const extra: Record<string, string> = {};
    let mid = '';
    let selectionRaw = '';
    let platformRaw = '';
    let mediaUrls: string[] = [];
    headers.forEach((h, c) => {
      const v = clean(rec[c]);
      const m = mapping[c];
      if (!v || m === 'ignore') return;
      if (m === 'extra' && MEDIA_HEADERS.has(normHeader(h))) mediaUrls = cleanUrls(v);
      else if (m === 'extra') extra[h.slice(0, 40)] = v.slice(0, 2000);
      else if (m === 'managementId') mid = v.slice(0, 60);
      else if (m === 'selection') selectionRaw = v.slice(0, 60);
      else if (m === 'platform') platformRaw = v.slice(0, 60);
      else fields[m] = v;
    });
    if (!fields.body && !fields.title) {
      if (Object.keys(extra).length || mid) errors.push({ row: rowNo, message: '本文もタイトルも空のためスキップしました' });
      return;
    }
    if (input.requirePlatform && !normPlatform(platformRaw)) {
      errors.push({ row: rowNo, message: '媒体（どのSNS用か）が未指定のためスキップしました。X / Instagram / Threads / Facebook / TikTok / YouTube Shorts / LINE / Googleビジネス のいずれかを必ず指定してください' });
      return;
    }
    let auto = false;
    if (!mid) {
      auto = true;
      mid = 'AUTO-' + createHash('sha1').update(normalize(`${fields.title ?? ''}${fields.body ?? ''}`)).digest('hex').slice(0, 10);
    }
    const key = docIdOf(mid);
    if (seen.has(key)) {
      errors.push({ row: rowNo, message: `管理ID「${mid}」がこのデータ内で重複しています（後の行をスキップ）` });
      return;
    }
    seen.add(key);
    parsed.push({ managementId: mid, auto, fields, selectionRaw, platform: normPlatform(platformRaw), mediaUrls, extra, rowNo });
  });

  const refs = parsed.map((p) => col(uid).doc(docIdOf(p.managementId)));
  const existing = new Set<string>();
  for (let i = 0; i < refs.length; i += 300) {
    const snaps = await db().getAll(...refs.slice(i, i + 300));
    for (const s of snaps) if (s.exists) existing.add(s.id);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const preview: Array<{ managementId: string; title: string; result: 'new' | 'skip' | 'update' }> = [];
  let batch = db().batch();
  let inBatch = 0;
  const flush = async () => {
    if (inBatch) await batch.commit();
    batch = db().batch();
    inBatch = 0;
  };

  for (const p of parsed) {
    const ref = col(uid).doc(docIdOf(p.managementId));
    const exists = existing.has(ref.id);
    const result: 'new' | 'skip' | 'update' = !exists ? 'new' : mode === 'update' ? 'update' : 'skip';
    if (preview.length < 30) preview.push({ managementId: p.managementId, title: p.fields.title ?? (p.fields.body ?? '').slice(0, 30), result });
    if (result === 'skip') {
      skipped++;
      continue;
    }
    if (result === 'new') created++;
    else updated++;
    if (input.dryRun) continue;

    const base = { ...Object.fromEntries(Object.entries(p.fields)), ...(p.platform ? { platform: p.platform } : {}), ...(p.mediaUrls.length ? { mediaUrls: p.mediaUrls } : {}), extra: p.extra, managementId: p.managementId, updatedAt: FieldValue.serverTimestamp() };
    if (result === 'new') {
      const full: Record<string, unknown> = {};
      for (const f of TEXT_FIELDS) full[f] = p.fields[f] ?? '';
      batch.set(ref, {
        ...full,
        managementId: p.managementId,
        extra: p.extra,
        mediaUrls: p.mediaUrls,
        ...fingerprint(p.fields.title ?? '', p.fields.body ?? '', p.fields.theme ?? ''),
        selection: toSelection(p.selectionRaw),
        selectionRaw: p.selectionRaw,
        platform: p.platform,
        status: 'candidate',
        source: 'import',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // 更新: シートに値がある項目だけ上書きする。人が付けた選定状況・状態・下書きとの紐づけは保持する
      batch.set(ref, p.fields.body || p.fields.title || p.fields.theme ? { ...base, ...fingerprint(p.fields.title ?? '', p.fields.body ?? '', p.fields.theme ?? '') } : base, { merge: true });
    }
    inBatch++;
    if (inBatch >= 400) await flush();
  }
  if (!input.dryRun) {
    await flush();
    bust(uid);
    await addSeriesNames(uid, parsed.map((p) => p.fields.series));
    await writeAuditLog(uid, 'candidates.import', `新規${created} / 更新${updated} / スキップ${skipped}`);
  }

  return {
    dryRun: !!input.dryRun,
    mode,
    summary: { rows: records.length, new: created, updated, skippedExisting: skipped, errors: errors.length },
    columns: headers.map((h, i) => ({ column: h, mappedTo: mapping[i], label: mapping[i] === 'extra' ? '追加項目として保存' : mapping[i] === 'ignore' ? '無視' : FIELD_LABEL[mapping[i] as FieldKey] })),
    autoIdCount: parsed.filter((p) => p.auto).length,
    preview,
    errors: errors.slice(0, 30),
    note: '取り込みは「候補」として保存するだけです。下書き・予約・公開は作られません。投稿日時は未設定のままです。',
  };
}

// ---- 取得・更新 ----

export interface ListQuery {
  query?: string;
  series?: string;
  selection?: string;
  selections?: string[];
  status?: string;
  platform?: string;
  limit?: number;
  cursor?: string;
}

/**
 * 絞り込み＋ページ送りで必要な分だけ読む(全件は読まない)。並びは管理ID(ドキュメントID)順。
 * platform: 媒体ID。カンマ区切りで複数、'none' は媒体未設定、'+none' を付けると未設定も含める。
 */
export async function queryCandidates(uid: string, q: ListQuery = {}): Promise<{ candidates: Candidate[]; nextCursor?: string }> {
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);
  let query: FirebaseFirestore.Query = col(uid);
  if (q.platform) {
    const want = q.platform.split(',').map((x) => x.trim()).filter(Boolean);
    const vals = new Set<string>();
    for (const w of want) { if (w === 'none' || w === '+none') vals.add(''); else vals.add(w); }
    const arr = [...vals];
    query = arr.length === 1 ? query.where('platform', '==', arr[0]) : query.where('platform', 'in', arr.slice(0, 30));
  }
  if (q.series) query = query.where('series', '==', q.series);
  if (q.selection) query = query.where('selection', '==', q.selection);
  else if (q.selections?.length) query = query.where('selection', 'in', q.selections.slice(0, 30));
  if (q.status) query = query.where('status', '==', q.status);
  query = query.orderBy(FieldPath.documentId());
  if (q.cursor) query = query.startAfter(q.cursor);
  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs.slice(0, limit);
  return {
    candidates: docs.map((d) => fromDoc(d.id, d.data())),
    nextCursor: snap.size > limit ? docs[docs.length - 1].id : undefined,
  };
}

/** 画面・AI(MCP)共通の一覧。文字検索のときだけ(キャッシュ付きで)走査し、通常はクエリでページ送り */
export async function listCandidates(uid: string, q: ListQuery = {}) {
  const [cnt, series] = await Promise.all([candidateCounts(uid), getSeriesNames(uid)]);
  const meta = { total: cnt.all, counts: cnt.counts, statusCounts: cnt.statusCounts, platformCounts: cnt.platformCounts, series };
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);

  if (q.query?.trim()) {
    // 文字検索(本文・タイトル等の部分一致)はFirestoreでは出来ないため、直近のまとまりを(キャッシュ付きで)走査する
    let list = [...(await loadAllCandidates(uid))];
    if (q.platform) {
      const want = q.platform.split(',').map((x) => x.trim()).filter(Boolean);
      const withNone = want.includes('+none');
      list = list.filter((c) => want.includes(c.platform) || ((withNone || want.includes('none')) && !c.platform));
    }
    if (q.series) list = list.filter((c) => c.series === q.series);
    if (q.selection) list = list.filter((c) => c.selection === q.selection);
    if (q.status) list = list.filter((c) => c.status === q.status);
    const k = q.query.normalize('NFKC').toLowerCase();
    list = list.filter((c) => `${c.managementId} ${c.title} ${c.body} ${c.series} ${c.theme} ${Object.values(c.extra).join(' ')}`.normalize('NFKC').toLowerCase().includes(k));
    list.sort((a, b) => a.managementId.localeCompare(b.managementId, 'ja', { numeric: true }));
    const start = q.cursor ? Math.max(0, list.findIndex((c) => c.id === q.cursor) + 1) : 0;
    const page = list.slice(start, start + limit);
    return { ...meta, candidates: page, nextCursor: start + limit < list.length ? page[page.length - 1]?.id : undefined };
  }

  try {
    const r = await queryCandidates(uid, q);
    return { ...meta, ...r };
  } catch (e) {
    // インデックス等でクエリが使えない場合の保険(従来方式)
    console.error('queryCandidates fallback', e instanceof Error ? e.message : e);
    let list = [...(await loadAllCandidates(uid))];
    if (q.platform) {
      const want = q.platform.split(',').map((x) => x.trim()).filter(Boolean);
      const withNone = want.includes('+none');
      list = list.filter((c) => want.includes(c.platform) || ((withNone || want.includes('none')) && !c.platform));
    }
    if (q.series) list = list.filter((c) => c.series === q.series);
    if (q.selection) list = list.filter((c) => c.selection === q.selection);
    else if (q.selections?.length) list = list.filter((c) => q.selections!.includes(c.selection));
    if (q.status) list = list.filter((c) => c.status === q.status);
    list.sort((a, b) => a.managementId.localeCompare(b.managementId, 'ja', { numeric: true }));
    const start = q.cursor ? Math.max(0, list.findIndex((c) => c.id === q.cursor) + 1) : 0;
    const page = list.slice(start, start + limit);
    return { ...meta, candidates: page, nextCursor: start + limit < list.length ? page[page.length - 1]?.id : undefined };
  }
}

export async function getCandidate(uid: string, id: string): Promise<Candidate> {
  const s = await col(uid).doc(id).get();
  if (!s.exists) throw new Error('投稿候補が見つかりません');
  return fromDoc(s.id, s.data()!);
}

export interface CandidatePatch extends Partial<Record<TextField, string>> {
  selection?: Selection;
  platform?: string;
  aiSuggestion?: string;
  mediaUrls?: string[];
}

/** 人による更新。AI（MCP）経由では selection は変更できない（採用の判断は人） */
export async function updateCandidate(uid: string, id: string, patch: CandidatePatch, by: 'human' | 'ai') {
  const ref = col(uid).doc(id);
  const s = await ref.get();
  if (!s.exists) throw new Error('投稿候補が見つかりません');
  const upd: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const f of TEXT_FIELDS) if (typeof patch[f] === 'string') upd[f] = clean(patch[f]);
  if (by === 'human' && patch.selection) {
    if (!(patch.selection in SELECTION_LABEL)) throw new Error('選定状況が正しくありません');
    upd.selection = patch.selection;
    upd.selectionRaw = SELECTION_LABEL[patch.selection];
  }
  if (typeof patch.platform === 'string') upd.platform = normPlatform(patch.platform);
  if (Array.isArray(patch.mediaUrls)) upd.mediaUrls = cleanUrls(patch.mediaUrls);
  if (typeof patch.title === 'string' || typeof patch.body === 'string' || typeof patch.theme === 'string') {
    const cur = s.data()!;
    Object.assign(upd, fingerprint(String(upd.title ?? cur.title ?? ''), String(upd.body ?? cur.body ?? ''), String(upd.theme ?? cur.theme ?? '')));
  }
  if (typeof patch.series === 'string') void addSeriesNames(uid, [String(upd.series ?? '')]);
  if (typeof patch.aiSuggestion === 'string') {
    upd.aiSuggestion = clean(patch.aiSuggestion, 3000);
    upd.aiSuggestedAt = FieldValue.serverTimestamp();
  }
  await ref.update(upd);
  bust(uid);
  await writeAuditLog(uid, by === 'ai' ? 'candidates.update.ai' : 'candidates.update', `${s.data()!.managementId ?? id}: ${Object.keys(upd).filter((k) => k !== 'updatedAt').join(',')}`);
  return getCandidate(uid, id);
}

export async function addCandidatesFromAi(uid: string, rows: Array<Record<string, unknown>>, opts: { columnMap?: ColumnMap; dryRun?: boolean }) {
  // AI からの追加は、選定状況を渡されても常に「未選定」から始める
  const stripped = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      if (toSelectionHeader(k)) continue;
      o[k] = v;
    }
    return o;
  });
  return importCandidates(uid, { rows: stripped, columnMap: opts.columnMap, mode: 'skip', dryRun: opts.dryRun, requirePlatform: true });
}
const toSelectionHeader = (h: string) => mapHeaders([h])[0] === 'selection';

/** 自分で書いたネタを、そのまま候補に入れる（選定状況は未選定から。下書き・予約は作らない） */
export async function createManualCandidate(uid: string, input: { body?: string; title?: string; platform?: string; series?: string; mediaUrls?: string[] }) {
  const body = clean(input.body);
  if (!body) throw new Error('ネタの本文を入力してください');
  if (!normPlatform(input.platform ?? '')) throw new Error('どのSNS用か（媒体）を選んでください');
  const id = `MY-${Date.now().toString(36).toUpperCase()}`;
  await col(uid).doc(id).set({
    managementId: id,
    title: clean(input.title, 200) || body.split('\n')[0].slice(0, 30),
    body,
    series: clean(input.series, 100),
    platform: normPlatform(input.platform ?? ''),
    imageIdea: '', rating: '', checkNotes: '', editNotes: '', theme: '', conclusion: '', punchline: '',
    extra: {},
    mediaUrls: cleanUrls(input.mediaUrls),
    ...fingerprint(clean(input.title, 200) || body.split('\n')[0].slice(0, 30), body),
    selection: 'unreviewed',
    selectionRaw: '',
    status: 'candidate',
    source: 'manual',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  bust(uid);
  await addSeriesNames(uid, [input.series]);
  await writeAuditLog(uid, 'candidates.create', id);
  return getCandidate(uid, id);
}

const statusFromJob = (s: string): CandidateStatus =>
  s === 'published' || s === 'notified' ? 'published' : s === 'draft' ? 'drafted' : s === 'failed' ? 'drafted' : 'scheduled';

/**
 * 候補の入り口をひとつにそろえる（何度実行しても重複しない）:
 *  - ネタ帳（自分で書いたネタ・AIが追加したネタ）
 *  - Xシリーズ在庫（「ネタを一気に作る」で作ったもの）
 *  - カレンダーの下書き（AIが作った下書き）
 * 既存の投稿・予約・シリーズ・ネタ帳は変更しない（読み取り専用）。候補側の状態（下書き/予約済み/投稿済み）は元の投稿に合わせて更新する。
 */
export async function syncCandidates(ctx: AgentCtx, opts: { force?: boolean } = {}) {
  const uid = ctx.uid;
  // 5分以内に実施済みなら何もしない
  const last = lastSync.get(uid) ?? 0;
  if (!opts.force && Date.now() - last < SYNC_MIN_INTERVAL_MS) return { created: 0, refreshed: 0, skipped: true };
  lastSync.set(uid, Date.now());

  // 差分同期: 前回の同期時刻より後に変わったものだけを読む(初回だけ全体)
  const flagRef = db().doc(`users/${uid}/prefs/candidateSync`);
  const startedAt = new Date().toISOString();
  const sinceIso = (await flagRef.get()).data()?.at as string | undefined;
  const sinceMs = sinceIso ? Date.parse(sinceIso) - 60_000 : 0;
  const CREATE_CAP = 600;

  let batch = db().batch();
  let n = 0;
  let created = 0;
  let refreshed = 0;
  let truncated = false;
  const commitIfFull = async () => {
    if (n >= 400) { await batch.commit(); batch = db().batch(); n = 0; }
  };
  /** 指定IDの既存候補だけをまとめて取得(存在確認) */
  const existing = async (ids: string[]) => {
    const out = new Map<string, FirebaseFirestore.DocumentData>();
    for (let i = 0; i < ids.length; i += 300) {
      const refs = ids.slice(i, i + 300).map((x) => col(uid).doc(x));
      if (!refs.length) continue;
      for (const d of await db().getAll(...refs)) if (d.exists) out.set(d.id, d.data()!);
    }
    return out;
  };
  const create = async (id: string, data: Record<string, unknown>) => {
    if (created >= CREATE_CAP) { truncated = true; return; }
    batch.set(col(uid).doc(id), {
      series: '', imageIdea: '', rating: '', checkNotes: '', editNotes: '', theme: '', conclusion: '', punchline: '',
      selectionRaw: '', extra: {}, selection: 'unreviewed', ...data,
      ...fingerprint(String(data.title ?? ''), String(data.body ?? '')),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    n++; created++;
    await commitIfFull();
  };
  const update = async (id: string, patch: Record<string, unknown>) => {
    batch.update(col(uid).doc(id), { ...patch, updatedAt: FieldValue.serverTimestamp() });
    n++; refreshed++;
    await commitIfFull();
  };

  // 1) ネタ帳(新しいものだけ)
  const ideas = (await listIdeaInbox(uid).catch(() => [])).filter((i) => i.text.trim() && (!sinceMs || Date.parse(i.createdAt) > sinceMs));
  const haveIdeas = await existing(ideas.map((i) => `IDEA-${i.id}`));
  for (const i of ideas) {
    const id = `IDEA-${i.id}`;
    if (haveIdeas.has(id)) continue;
    const text = i.text.trim();
    await create(id, {
      managementId: `IDEA-${i.id.slice(0, 8)}`, title: text.split('\n')[0].slice(0, 30), body: text,
      platform: '', source: 'idea', sourceKey: `idea:${i.id}`,
      status: i.status === 'used' ? 'drafted' : 'candidate',
      extra: i.author ? { 投稿者: i.author } : {},
    });
  }

  // 2) Xシリーズ在庫(前回以降に追加・更新されたものだけ)
  try {
    const sinceTs = sinceMs ? Timestamp.fromMillis(sinceMs) : null;
    const series = await db().collection(`users/${uid}/xSeries`).limit(200).get();
    for (const sdoc of series.docs) {
      const sname = String(sdoc.data().name ?? '');
      let q: FirebaseFirestore.Query = sdoc.ref.collection('items');
      if (sinceTs) q = q.where('updatedAt', '>', sinceTs);
      const items = await q.limit(500).get();
      if (items.size >= 500) truncated = true;
      const have = await existing(items.docs.map((it) => `XS-${it.id}`));
      for (const it of items.docs) {
        const x = it.data();
        const text = String(x.text ?? '').trim();
        if (!text) continue;
        const id = `XS-${it.id}`;
        const status: CandidateStatus = x.status === 'published' ? 'published' : 'candidate';
        const cur = have.get(id);
        if (cur) {
          if (cur.status !== status && status === 'published') await update(id, { status });
          continue;
        }
        await create(id, {
          managementId: id, title: String(x.title || text.split('\n')[0]).slice(0, 30), body: text, series: sname,
          platform: 'x_thread', source: 'xseries', sourceKey: `xseries:${it.id}`,
          selection: x.approved ? 'adopted' : 'unreviewed', selectionRaw: x.approved ? '採用' : '', status,
          extra: { ...(x.tags ? { タグ: String(x.tags) } : {}), ...(x.imageAlt ? { 画像ALT: String(x.imageAlt) } : {}) },
          mediaUrls: cleanUrls(x.imageUrl),
          ...(x.scheduledAt ? { scheduledAt: x.scheduledAt } : {}),
        });
      }
      if (sname) await addSeriesNames(uid, [sname]);
    }
  } catch {
    // シリーズが無い・読めない場合は他の入り口だけで続行
  }

  // 3) カレンダーの下書き + 紐づいた候補の状態更新(直近の予約だけを対象)
  const jobs = await getScheduledJobs(uid, undefined, ctx.personaId, 300);
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const linked = new Map<string, FirebaseFirestore.DocumentData & { _id: string }>();
  const jobIds = jobs.map((j) => j.id);
  for (let i = 0; i < jobIds.length; i += 30) {
    const r = await col(uid).where('linkedJobId', 'in', jobIds.slice(i, i + 30)).get();
    for (const d of r.docs) linked.set(String(d.data().linkedJobId), { ...d.data(), _id: d.id });
  }
  const drafts = jobs.filter((j) => j.status === 'draft' && !linked.has(j.id) && jobText(j).trim());
  const haveDr = await existing(drafts.map((j) => `DR-${j.id}`));
  for (const j of drafts) {
    const key = `DR-${j.id}`;
    if (haveDr.has(key)) continue;
    const text = jobText(j).trim();
    await create(key, {
      managementId: key.slice(0, 11), title: String(j.topic || text.split('\n')[0]).slice(0, 30), body: text,
      platform: platformOf(j), source: 'draft', sourceKey: `job:${j.id}`, linkedJobId: j.id, status: 'drafted', scheduledAt: j.scheduledAt,
      extra: {}, mediaUrls: cleanUrls(j.mediaUrls),
    });
  }
  for (const [jid, d] of linked) {
    const job = jobById.get(jid);
    if (!job) continue;
    const st = statusFromJob(job.status);
    if (d.status !== st || d.scheduledAt !== job.scheduledAt) await update(d._id, { status: st, scheduledAt: job.scheduledAt });
  }
  if (n) await batch.commit();
  await migrateUnsetPlatformToX(uid);
  // 取りこぼし(件数上限)が無いときだけ、次回の差分の起点を進める
  if (!truncated) await flagRef.set({ at: startedAt });
  if (created || refreshed) bust(uid);
  return { created, refreshed };
}

/** 一度だけ: これまで媒体未設定だった候補（ChatGPT連携で入れたXの投稿案など）をXに分類する */
async function migrateUnsetPlatformToX(uid: string) {
  const flag = db().doc(`users/${uid}/prefs/candidatePlatformX`);
  if ((await flag.get()).exists) return;
  let total = 0;
  for (let page = 0; page < 200; page++) {
    const snap = await col(uid).where('platform', '==', '').limit(400).get();
    if (snap.empty) break;
    const b = db().batch();
    for (const d of snap.docs) b.update(d.ref, { platform: 'x_thread', updatedAt: FieldValue.serverTimestamp() });
    await b.commit();
    total += snap.size;
    if (snap.size < 400) break;
  }
  await flag.set({ done: true, count: total, at: new Date().toISOString() });
  bust(uid);
  if (total) await writeAuditLog(uid, 'candidates.migrate_platform_x', `${total}件`);
}

/**
 * 候補を、人が日時を決めて「下書き」または「予約（時間になったら自動投稿）」にする。
 * 予約を押すこと自体が採用の判断なので、選定状況は「採用」になる（不採用の候補は不可）。
 * Xは連携済みなら自動投稿。それ以外・未連携は、通知リマインダー（自分で投稿）になる。
 */
export async function candidateToJob(ctx: AgentCtx, id: string, input: { scheduledAt?: string; platform?: string; mode?: 'draft' | 'schedule' }) {
  const c = await getCandidate(ctx.uid, id);
  if (c.selection === 'rejected') throw new Error('「不採用」の候補は予定にできません。先に未選定などへ戻してください');
  if (c.linkedJobId && c.status !== 'candidate') throw new Error(`すでにカレンダーに入っています（${STATUS_LABEL[c.status]}）。二重に作らないよう止めました。カレンダーで確認してください`);
  if (!c.body.trim()) throw new Error('投稿本文が空です');
  if (!c.mediaUrls.length) throw new Error('画像が未設定です。投稿には画像が必須のため、候補の画面で画像を貼り付けてから予約してください');
  const platform = input.platform || c.platform || 'x_thread';
  if (!(TARGET_PLATFORMS as string[]).includes(platform)) throw new Error(`媒体は ${TARGET_PLATFORMS.join(' / ')} のいずれかです`);
  const when = new Date(input.scheduledAt ?? '');
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) throw new Error('投稿日時は未来の日時を指定してください');
  const mode = input.mode === 'schedule' ? 'schedule' : 'draft';
  const label = c.title || c.managementId;

  let jobId: string;
  let message: string;
  let publishMode: PublishMode | undefined;
  if (mode === 'draft') {
    const r = await opCreateDraft(ctx, {
      contents: [{ platform, label, content: c.body }],
      scheduledAt: when.toISOString(), topic: c.title || undefined, silent: true, mediaUrls: c.mediaUrls,
    });
    jobId = r.jobId;
    message = '下書きにしました。カレンダーで確認し、予約してください。';
  } else {
    await assertPostQuota(ctx.uid);
    const effective = await getEffectiveSettings(ctx.uid, ctx.personaId);
    const persona = await getPersona(ctx.personaId);
    const desired: PublishMode = platform === 'x_thread' ? 'x_free' : platform === 'line' ? 'line' : 'notify';
    let note = '';
    if (persona && personaRequiresApproval(persona)) {
      publishMode = 'approval';
      note = '公式キャラのため、承認待ちになります。承認後に予約キューへ入ります。';
    } else if (desired !== 'notify' && !assertConnectedForPublishMode(effective, desired)) {
      publishMode = desired;
      note = '時間になったら自動で投稿されます。';
    } else {
      publishMode = 'notify';
      note = desired === 'notify'
        ? `${PLATFORM_LABEL[platform] ?? platform}は、時間になると通知でお知らせします（自分で投稿）。`
        : `${PLATFORM_LABEL[platform] ?? platform}が未連携のため、通知でお知らせします（自分で投稿）。設定でSNS連携すると自動投稿になります。`;
    }
    await incrementPostQuota(ctx.uid);
    jobId = await createScheduledJob(ctx.uid, {
      contents: [{ platform, label, content: c.body }],
      mediaUrls: c.mediaUrls,
      scheduledAt: when.toISOString(),
      publishMode,
      personaId: ctx.personaId,
      topic: c.title || undefined,
      dualApprovalRequired: publishMode === 'approval' && persona?.type === 'official',
      createdBy: 'user',
    });
    if (publishMode === 'approval') {
      await notifyApprovalNeeded(ctx.uid, { jobId, personaId: ctx.personaId, publishMode, scheduledAt: when.toISOString(), contentSummary: label });
    }
    message = `${when.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} に予約しました。${note}`;
  }
  await col(ctx.uid).doc(id).update({
    status: mode === 'schedule' ? 'scheduled' : 'drafted', linkedJobId: jobId, platform,
    selection: 'adopted', selectionRaw: '採用', scheduledAt: when.toISOString(), updatedAt: FieldValue.serverTimestamp(),
  });
  bust(ctx.uid);
  await writeAuditLog(ctx.uid, 'candidates.to_job', `${c.managementId} → ${jobId} (${mode}${publishMode ? '/' + publishMode : ''})`);
  return { success: true, jobId, mode, publishMode, message, candidateId: id };
}

// ---- 重複チェック ----

const JOB_STATE: Record<string, string> = {
  published: '投稿済み',
  notified: '投稿済み(通知)',
  pending: '予約済み',
  processing: '投稿中',
  pending_approval: '承認待ち',
  draft: '下書き',
  failed: '失敗',
};

/**
 * 比べる相手を集める。全件ではなく、指紋(fp/fpk)が重なる「似ていそうな候補」だけを検索し、
 * それに直近の下書き/予約/投稿済みとネタ帳(いずれも件数に上限あり)を足す。
 * Xシリーズ在庫は同期で候補に取り込まれているため、候補側で比べる。
 */
export async function gatherDupPool(ctx: AgentCtx, target: DupTarget): Promise<DupItem[]> {
  await ensureFingerprints(ctx.uid);
  const fpr = fingerprint(target.title ?? '', target.text, target.theme ?? '');
  const seen = new Map<string, Candidate>();
  const run = async (field: 'fp' | 'fpk', vals: string[]) => {
    if (!vals.length) return;
    const r = await col(ctx.uid).where(field, 'array-contains-any', vals.slice(0, 30)).limit(60).get();
    for (const d of r.docs) seen.set(d.id, fromDoc(d.id, d.data()));
  };
  await Promise.all([run('fp', fpr.fp), run('fpk', fpr.fpk)]);

  const key = `${ctx.uid}:${ctx.personaId ?? ''}`;
  let extra = poolCache.get(ctx.uid);
  if (!extra || extra.key !== key || Date.now() - extra.at >= CACHE_TTL_MS) {
    const [jobs, ideas] = await Promise.all([
      getScheduledJobs(ctx.uid, undefined, ctx.personaId, 300),
      listIdeaInbox(ctx.uid).catch(() => []),
    ]);
    const items: DupItem[] = [];
    for (const j of jobs) {
      items.push({
        source: 'scheduled', id: j.id, title: j.topic,
        text: jobText(j), stateLabel: `${JOB_STATE[j.status] ?? j.status}(${platformOf(j)})`,
        published: j.status === 'published' || j.status === 'notified',
      });
    }
    for (const i of ideas) {
      items.push({ source: 'idea', id: i.id, text: i.text, stateLabel: i.status === 'used' ? 'ネタ帳(使用済み)' : 'ネタ帳', published: false });
    }
    extra = { at: Date.now(), key, pool: items };
    poolCache.set(ctx.uid, extra);
    if (poolCache.size > 100) poolCache.delete(poolCache.keys().next().value as string);
  }

  const linkedJobs = new Set<string>();
  const linkedKeys = new Set<string>();
  const out: DupItem[] = [];
  for (const c of seen.values()) {
    if (c.linkedJobId) linkedJobs.add(c.linkedJobId);
    if (c.sourceKey) linkedKeys.add(c.sourceKey);
    out.push({
      source: 'candidate', id: c.id, managementId: c.managementId, title: c.title,
      text: c.body || c.title,
      stateLabel: `投稿候補(${STATUS_LABEL[c.status]}${c.status === 'candidate' ? '・' + SELECTION_LABEL[c.selection] : ''}${c.platform ? '・' + (PLATFORM_LABEL[c.platform] ?? c.platform) : ''})`,
      published: c.status === 'published', series: c.series, theme: c.theme, conclusion: c.conclusion, punchline: c.punchline,
    });
  }
  for (const it of extra.pool) {
    if (it.source === 'scheduled' && linkedJobs.has(it.id)) continue;
    if (it.source === 'idea' && linkedKeys.has(`idea:${it.id}`)) continue;
    out.push(it);
  }
  return out;
}
export interface DupPrefs { useAi: boolean }
export async function getDupPrefs(uid: string): Promise<DupPrefs> {
  const s = await db().doc(`users/${uid}/prefs/dupCheck`).get();
  return { useAi: s.data()?.useAi === true };
}
export async function saveDupPrefs(uid: string, p: DupPrefs) {
  await db().doc(`users/${uid}/prefs/dupCheck`).set({ useAi: !!p.useAi, updatedAt: new Date().toISOString() }, { merge: true });
  return getDupPrefs(uid);
}

export interface DupResult {
  matches: DupMatch[];
  searched: number;
  engine: 'rule' | 'rule+ai';
  /** AI を使った場合の提供元（運営AI/自分のAIキー）や、使えなかった理由 */
  aiNote?: string;
  note: string;
}

export async function checkDuplicates(ctx: AgentCtx, target: DupTarget, opts: { ai?: boolean } = {}): Promise<DupResult> {
  if (!target.text?.trim()) throw new Error('text が必要です');
  const pool = await gatherDupPool(ctx, target);
  const { matches, pool: aiPool } = findDuplicates(target, pool);
  const wantAi = opts.ai ?? (await getDupPrefs(ctx.uid)).useAi;
  const base = { searched: pool.length, note: '自動では削除しません。似ているかどうかは人が判断してください。「結論が同じ」「オチが同じ」はルールだけでは見逃すことがあります。' };
  if (!wantAi) return { ...base, matches, engine: 'rule' };

  return withUserAi(ctx.uid, async () => {
    if (!aiKey()) return { ...base, matches, engine: 'rule' as const, aiNote: 'AIが設定されていないため、ルール判定のみです。' };
    if (!aiPool.length) return { ...base, matches, engine: 'rule+ai' as const, aiNote: '比べる候補が無いため、AI判定は行いませんでした。' };
    const settings = await getAiSettings(ctx.uid);
    try {
      const st = await getUserSettings(ctx.uid);
      await consumeAiQuota(ctx.uid, st.plan);
      const res = await aiFetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: buildAiDupPrompt(target, aiPool) }] }], generationConfig: { temperature: 0, maxOutputTokens: 1200 } }),
      });
      if (!res.ok) throw new Error(`AI呼び出しに失敗しました(HTTP ${res.status})`);
      const j = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      const merged = mergeAiVerdicts(matches, aiPool, parseAiVerdicts(text));
      const who = settings.mode === 'own' ? `自分のAIキー(${settings.provider})` : '運営AI';
      return { ...base, matches: merged, engine: 'rule+ai' as const, aiNote: `AI判定を併用しました（${who}）。` };
    } catch (e) {
      const msg = e instanceof AiQuotaError ? e.message : e instanceof Error ? e.message : 'AI判定に失敗しました';
      return { ...base, matches, engine: 'rule' as const, aiNote: `AI判定は使えませんでした（${msg}）。ルール判定の結果を表示しています。` };
    }
  });
}

export const targetOf = (c: Candidate): DupTarget => ({
  selfKey: `candidate:${c.id}`,
  text: c.body || c.title,
  title: c.title,
  theme: c.theme,
  conclusion: c.conclusion,
  punchline: c.punchline,
});

// ---- CSV 出力（Google スプレッドシートのバックアップ用） ----

const csvCell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function exportCandidatesCsv(uid: string): Promise<string> {
  const candidates: Candidate[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 40; page++) {
    const r = await queryCandidates(uid, { limit: 500, cursor });
    candidates.push(...r.candidates);
    if (!r.nextCursor) break;
    cursor = r.nextCursor;
  }
  const extraKeys = [...new Set(candidates.flatMap((c) => Object.keys(c.extra)))];
  const head = ['管理ID', 'シリーズ', 'タイトル', '投稿本文', '画像案', '評価', '選定状況', '確認事項', '編集メモ', 'テーマ', '結論', 'オチ', '状態', ...extraKeys];
  const lines = [head.map(csvCell).join(',')];
  for (const c of candidates) {
    lines.push(
      [c.managementId, c.series, c.title, c.body, c.imageIdea, c.rating, SELECTION_LABEL[c.selection], c.checkNotes, c.editNotes, c.theme, c.conclusion, c.punchline, c.status === 'drafted' ? '下書き移行済み' : '候補', ...extraKeys.map((k) => c.extra[k] ?? '')]
        .map((v) => csvCell(String(v)))
        .join(','),
    );
  }
  return '\uFEFF' + lines.join('\r\n');
}

// ---- 画面用 API ----

export const candidatesRouter = Router();

async function ctxOf(req: AuthedRequest, write = false): Promise<AgentCtx> {
  const personaId = await resolveActivePersonaId(req.uid!);
  if (write) await assertPersonaAccess(personaId, req.uid!, 'editor');
  return { uid: req.uid!, personaId };
}
const fail = (res: import('express').Response, err: unknown) => res.status(400).json({ error: err instanceof Error ? err.message : '失敗しました' });

candidatesRouter.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    // 前回の版と同じなら、中身を読まずに「変更なし」を返す(読み取り1回)
    const version = await candidatesVersion(req.uid!);
    if (q.v && q.v === version) { res.json({ notModified: true, version }); return; }
    const r = await listCandidates(req.uid!, { query: q.q, series: q.series, selection: q.selection, status: q.status, platform: q.platform, cursor: q.cursor, limit: Number(q.limit) || 50 });
    res.json({
      ...r,
      version,
      // 一覧に要らない長い項目は送らない(通信量・描画の削減)。全文は1件取得で返す
      candidates: r.candidates.map((c) => ({ ...c, body: c.body.slice(0, 120), extra: {}, checkNotes: '', editNotes: '', aiSuggestion: undefined, imageIdea: '', mediaUrls: c.mediaUrls.slice(0, 1) })),
    });
  } catch (e) { fail(res, e); }
});

/** 類似投稿チェックの設定とAIの利用状況。一覧とは別に、必要になったときだけ取得する */
candidatesRouter.get('/meta', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const ai = await getAiSettings(req.uid!);
    const st = await getUserSettings(req.uid!);
    res.json({
      prefs: await getDupPrefs(req.uid!),
      ai: { mode: ai.mode, provider: ai.provider, hasKey: ai.hasKey, usage: ai.mode === 'platform' ? await getAiUsage(req.uid!, st.plan) : null },
    });
  } catch (e) { fail(res, e); }
});

candidatesRouter.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await ctxOf(req, true);
    res.json({ candidate: await createManualCandidate(req.uid!, req.body as Parameters<typeof createManualCandidate>[1]) });
  } catch (e) { fail(res, e); }
});

/** 候補の入り口（ネタ帳・Xシリーズ在庫・下書き）をそろえる。画面を開くたびに呼んでよい（重複しない） */
/** 媒体が未設定の候補を、まとめて1つの媒体にする(取り込み直後に便利)。すでに媒体のある候補は変えない */
candidatesRouter.post('/set-platform', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const b = req.body as { platform?: string; ids?: string[] };
    const platform = normPlatform(b.platform ?? '');
    if (!platform) throw new Error('媒体を選んでください');
    const only = b.ids?.length ? new Set(b.ids) : null;
    let updated = 0;
    for (let page = 0; page < 200; page++) {
      const snap = await col(req.uid!).where('platform', '==', '').limit(400).get();
      const targets = snap.docs.filter((d) => !only || only.has(d.id));
      if (targets.length) {
        const batch = db().batch();
        for (const d of targets) batch.update(d.ref, { platform, updatedAt: FieldValue.serverTimestamp() });
        await batch.commit();
        updated += targets.length;
      }
      // 対象を絞った(ids)場合は1回で終了。全件指定は未設定が無くなるまで繰り返す
      if (only || snap.size < 400 || targets.length < snap.size) break;
    }
    bust(req.uid!);
    await writeAuditLog(req.uid!, 'candidates.set_platform', `${platform}: ${updated}件`);
    res.json({ updated });
  } catch (e) { fail(res, e); }
});

candidatesRouter.post('/sync', requireAuth, async (req: AuthedRequest, res) => {
  try { res.json(await syncCandidates(await ctxOf(req))); } catch (e) { fail(res, e); }
});

candidatesRouter.post('/import', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await ctxOf(req, true);
    const b = req.body as ImportInput;
    res.json(await importCandidates(req.uid!, { csv: b.csv, rows: b.rows, columnMap: b.columnMap, mode: b.mode, dryRun: b.dryRun === true }));
  } catch (e) { fail(res, e); }
});

candidatesRouter.get('/export-csv', requireAuth, async (req: AuthedRequest, res) => {
  try {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="buzzit-post-candidates.csv"');
    res.send(await exportCandidatesCsv(req.uid!));
  } catch (e) { fail(res, e); }
});

candidatesRouter.get('/prefs', requireAuth, async (req: AuthedRequest, res) => res.json(await getDupPrefs(req.uid!)));
candidatesRouter.put('/prefs', requireAuth, async (req: AuthedRequest, res) => {
  try { res.json(await saveDupPrefs(req.uid!, { useAi: (req.body as { useAi?: boolean }).useAi === true })); } catch (e) { fail(res, e); }
});

candidatesRouter.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    // 重複チェックは全件比較で重いので、ここでは行わない(画面で類似投稿を開いたときに /check で実行)
    res.json({ candidate: await getCandidate(req.uid!, String(req.params.id)) });
  } catch (e) { fail(res, e); }
});

candidatesRouter.post('/:id/check', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const c = await getCandidate(req.uid!, String(req.params.id));
    res.json(await checkDuplicates(await ctxOf(req), targetOf(c), { ai: (req.body as { ai?: boolean }).ai === true }));
  } catch (e) { fail(res, e); }
});

candidatesRouter.patch('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await ctxOf(req, true);
    res.json({ candidate: await updateCandidate(req.uid!, String(req.params.id), req.body as CandidatePatch, 'human') });
  } catch (e) { fail(res, e); }
});

candidatesRouter.post('/:id/schedule', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const b = req.body as { scheduledAt?: string; platform?: string; mode?: 'draft' | 'schedule' };
    res.json(await candidateToJob(await ctxOf(req, true), String(req.params.id), b));
  } catch (e) { fail(res, e); }
});
candidatesRouter.post('/:id/draft', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const b = req.body as { scheduledAt?: string; platform?: string };
    res.json(await candidateToJob(await ctxOf(req, true), String(req.params.id), { ...b, mode: 'draft' }));
  } catch (e) { fail(res, e); }
});
/** 次に作る投稿ネタ探し用: 未使用(まだ下書きにしていない・不採用ではない)を、採用済み→未選定→要修正/保留の順で返す */
export async function listUnusedCandidates(uid: string, series: string | undefined, limit: number) {
  const r = await queryCandidates(uid, { series, status: 'candidate', selections: ['adopted', 'unreviewed', 'needs_fix', 'hold'], limit: 300 });
  const rank: Record<string, number> = { adopted: 0, unreviewed: 1, needs_fix: 2, hold: 3 };
  return r.candidates.sort((a, b) => (rank[a.selection] ?? 9) - (rank[b.selection] ?? 9)).slice(0, limit);
}
