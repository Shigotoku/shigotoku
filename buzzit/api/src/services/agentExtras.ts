/**
 * AI エージェント(MCP)・画面向けの拡張オペレーション。
 * - 接続中キャラ/アカウントの確認、投稿シリーズ・投稿計画の登録（既定はプレビューのみ）
 * - 下書き編集（下書きのみ）、冪等キー
 * - 投稿実績: X API を使わず「手入力 / X分析CSVの取り込み」で保存（費用ゼロ）
 * - シリーズ別・曜日別・時刻別の分析、週次レポート（実データのみ。理由は仮説として分離）
 * 書き込み系は「下書き・計画・実績の記録」に限り、承認・予約確定・投稿はできない。
 */
import { createHash } from 'node:crypto';
import { Router } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import {
  getScheduledJobs,
  getScheduledJob,
  updateScheduledJob,
  listPostInsights,
  upsertPostInsight,
  getPostingPlan,
  savePostingPlan,
  getUserSettings,
  type PlanSlot,
  type PostInsightDoc,
  type ScheduledJobDoc,
} from './firestore';
import { assertPersonaAccess, getPersona, getUserRoleInPersona, listPersonasForUser, resolveActivePersonaId } from './personas';
import { listAuditLogs, writeAuditLog } from './productExtras';
import { lintPost } from './postLint';
import { brief, externalUrl, jobText, jstParts, normTags, platformOf, type AgentCtx } from './agentApi';
import type { PersonaRecord } from '../types/persona';

const db = () => getFirestore();
const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// ===== 対象（キャラ・アカウント）の確認 =====

/** 書き込み系ツールで、AIが意図したキャラと接続中キャラが違う場合は中止する（推測しない） */
export async function assertTarget(ctx: AgentCtx, characterId?: string) {
  if (!characterId) return;
  if (characterId !== ctx.personaId) {
    const p = await getPersona(ctx.personaId);
    throw new Error(
      `この接続は「${p?.name ?? ctx.personaId}」(ID: ${ctx.personaId}) 専用です。指定されたキャラ(${characterId})には書き込めません。別のキャラで使うには、そのキャラを選んで再接続してください。`,
    );
  }
}

function accountsOf(p: PersonaRecord) {
  const id = (platform: string) => `acct:${p.id}:${platform}`;
  const list = [
    { accountId: id('x'), platform: 'x', connected: !!(p.xAccessToken && p.xAccessSecret), handle: p.xUsername ? `@${p.xUsername.replace(/^@/, '')}` : undefined },
    { accountId: id('instagram'), platform: 'instagram', connected: !!(p.metaIgUserId && (p.metaAccessToken || p.metaPageAccessToken)) },
    { accountId: id('facebook'), platform: 'facebook', connected: !!(p.metaPageId && (p.metaPageAccessToken || p.metaAccessToken)) },
    { accountId: id('threads'), platform: 'threads', connected: !!(p.metaAccessToken || p.metaPageAccessToken) },
    { accountId: id('line'), platform: 'line', connected: !!p.lineChannelAccessToken },
    { accountId: id('gbp'), platform: 'gbp', connected: !!p.gbpConnected, handle: p.gbpLocationName },
  ];
  const ledger = (p.accountLedger ?? []).map((e) => ({ service: e.service, handle: e.handle, url: e.url }));
  return { accounts: list, ledger };
}

function maskEmail(e?: string | null): string | undefined {
  if (!e) return undefined;
  const [l, d] = e.split('@');
  return `${l.slice(0, 2)}***@${d ?? ''}`;
}

export async function opWhoAmI(ctx: AgentCtx) {
  const p = await getPersona(ctx.personaId);
  if (!p) throw new Error('接続中のキャラが見つかりません');
  const { accounts } = accountsOf(p);
  const u = await getAuth().getUser(ctx.uid).catch(() => null);
  const role = await getUserRoleInPersona(ctx.personaId, ctx.uid).catch(() => null);
  return {
    user: { displayName: u?.displayName ?? null, emailMasked: maskEmail(u?.email) },
    character: { id: p.id, name: p.name, slug: p.slug, type: p.type, yourRole: role },
    accounts: accounts.map((a) => ({ ...a })),
    note: 'user は、この接続を承認したBuzzItのログインユーザーです。まずユーザー名・キャラ名が依頼者の想定と一致するか確認してください。一致しない場合は何も書き込まず、依頼者に知らせてください。この接続は上記のキャラ専用で、読み書きはそのキャラのデータだけが対象です。',
  };
}
export async function opListCharacters(ctx: AgentCtx) {
  const list = await listPersonasForUser(ctx.uid);
  return {
    characters: list.map((p) => ({ id: p.id, name: p.name, slug: p.slug, type: p.type, connected: p.id === ctx.personaId })),
    note: '操作できるのは connected=true のキャラだけです。',
  };
}

export async function opListAccounts(ctx: AgentCtx) {
  const p = await getPersona(ctx.personaId);
  if (!p) throw new Error('接続中のキャラが見つかりません');
  const { accounts, ledger } = accountsOf(p);
  return { characterId: p.id, accounts, ledger, note: '認証情報（トークン・パスワード）は返しません。接続状態と表示名のみです。' };
}

export async function opGetAccount(ctx: AgentCtx, platform: string) {
  const all = await opListAccounts(ctx);
  const a = all.accounts.find((x) => x.platform === platform || x.accountId === platform);
  if (!a) throw new Error('該当するアカウントがありません');
  return { characterId: all.characterId, account: a };
}

// ===== 冪等キー =====

export async function withIdempotency<T>(ctx: AgentCtx, tool: string, key: string | undefined, fn: () => Promise<T>): Promise<T | (T & { idempotentReplay: true })> {
  if (!key) return fn();
  const ref = db().collection('users').doc(ctx.uid).collection('agentIdempotency').doc(sha(`${ctx.personaId}|${tool}|${key}`));
  const snap = await ref.get();
  if (snap.exists) return { ...(snap.data()!.result as T), idempotentReplay: true as const };
  const result = await fn();
  await ref.set({ tool, personaId: ctx.personaId, result: JSON.parse(JSON.stringify(result)), createdAt: FieldValue.serverTimestamp() });
  return result;
}

// ===== 投稿シリーズ・投稿計画 =====

type SlotInput = Partial<PlanSlot> & { weekday: number; time: string };

function slotKey(s: { seriesName?: string; theme?: string; weekday: number; time: string; platform?: string }) {
  return `${(s.seriesName || s.theme || '').trim().toLowerCase()}|${s.weekday}|${s.time}|${s.platform || 'x_thread'}`;
}

function normalizeSlot(x: SlotInput): PlanSlot {
  const base: PlanSlot = {
    id: x.id || `sr_${sha(slotKey({ ...x, platform: x.platform ?? 'x_thread' })).slice(0, 10)}`,
    weekday: Math.min(6, Math.max(0, Number(x.weekday) || 0)),
    time: /^\d{2}:\d{2}$/.test(String(x.time)) ? String(x.time) : '12:00',
    platform: String(x.platform || 'x_thread'),
    theme: String(x.theme ?? x.seriesName ?? ''),
    tags: normTags(x.tags).slice(0, 5),
  };
  for (const k of ['seriesName', 'purpose', 'audience', 'category', 'tone', 'mediaKind', 'rules', 'ngRules', 'product'] as const) {
    if (typeof x[k] === 'string' && x[k]!.trim()) base[k] = x[k]!.trim();
  }
  if (x.active === false) base.active = false;
  return base;
}

const DIFF_FIELDS = ['weekday', 'time', 'platform', 'theme', 'seriesName', 'purpose', 'audience', 'category', 'tone', 'mediaKind', 'rules', 'ngRules', 'product', 'active'] as const;

export async function opListSeries(ctx: AgentCtx) {
  const slots = await getPostingPlan(ctx.uid, ctx.personaId);
  return {
    characterId: ctx.personaId,
    series: slots.map((s) => ({ ...s, weekdayLabel: WEEKDAYS[s.weekday], active: s.active !== false })),
    note: slots.length ? undefined : '投稿シリーズ／投稿計画はまだ登録されていません。upsert_plan（dryRun=true で内容確認）で登録できます。',
  };
}

export async function opGetSeries(ctx: AgentCtx, seriesId: string) {
  const slots = await getPostingPlan(ctx.uid, ctx.personaId);
  const s = slots.find((x) => x.id === seriesId);
  if (!s) throw new Error('シリーズが見つかりません');
  return { characterId: ctx.personaId, series: { ...s, weekdayLabel: WEEKDAYS[s.weekday], active: s.active !== false } };
}

/**
 * 投稿計画の作成・変更。
 * - 既定は dryRun=true（プレビューのみ・保存しない）
 * - 保存するには dryRun=false と characterId（接続中キャラのID）が必要
 * - 既存の枠は削除しない。id または「シリーズ名+曜日+時刻+媒体」が一致するものは更新（再実行しても増えない）
 * - 下書き・予約は一切作らない
 */
export async function opUpsertPlan(ctx: AgentCtx, input: { slots: SlotInput[]; dryRun?: boolean; characterId?: string }) {
  const dryRun = input.dryRun !== false;
  if (!Array.isArray(input.slots) || !input.slots.length) throw new Error('slots が必要です');
  if (!dryRun) {
    if (!input.characterId) throw new Error('保存するには characterId（whoami で確認した接続中キャラのID）が必要です');
    await assertTarget(ctx, input.characterId);
    await assertPersonaAccess(ctx.personaId, ctx.uid, 'editor');
  }
  const existing = await getPostingPlan(ctx.uid, ctx.personaId);
  const byId = new Map(existing.map((s) => [s.id, s]));
  const byKey = new Map(existing.map((s) => [slotKey(s), s]));
  const next = new Map(existing.map((s) => [s.id, s]));
  const added: PlanSlot[] = [];
  const updated: Array<{ id: string; seriesName?: string; changes: Record<string, { from: unknown; to: unknown }> }> = [];
  const unchanged: string[] = [];
  for (const raw of input.slots.slice(0, 40)) {
    const incoming = normalizeSlot(raw);
    const match = (raw.id && byId.get(raw.id)) || byKey.get(slotKey(incoming));
    if (!match) {
      if (!next.has(incoming.id)) {
        added.push(incoming);
        next.set(incoming.id, incoming);
        byKey.set(slotKey(incoming), incoming);
      }
      continue;
    }
    const merged: PlanSlot = { ...match, ...incoming, id: match.id };
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const f of DIFF_FIELDS) {
      const a = (match as unknown as Record<string, unknown>)[f];
      const b = (merged as unknown as Record<string, unknown>)[f];
      if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) changes[f] = { from: a ?? null, to: b ?? null };
    }
    if (Object.keys(changes).length) {
      updated.push({ id: match.id, seriesName: merged.seriesName, changes });
      next.set(match.id, merged);
    } else unchanged.push(match.id);
  }
  const summary = { added: added.length, updated: updated.length, unchanged: unchanged.length, kept: existing.length - updated.length - unchanged.length };
  if (dryRun) {
    return {
      dryRun: true,
      saved: false,
      characterId: ctx.personaId,
      summary,
      added: added.map((s) => ({ ...s, weekdayLabel: WEEKDAYS[s.weekday] })),
      updated,
      note: 'プレビューです（まだ保存していません）。内容と対象キャラを確認し、問題なければ dryRun=false と characterId を付けて再実行してください。下書き・投稿予約は作成されません。',
    };
  }
  const saved = await savePostingPlan(ctx.uid, ctx.personaId, [...next.values()]);
  await writeAuditLog(ctx.uid, 'agent.plan.upsert', `追加${added.length}/更新${updated.length}`, { personaId: ctx.personaId });
  return {
    dryRun: false,
    saved: true,
    characterId: ctx.personaId,
    summary,
    added: added.map((s) => s.id),
    updated: updated.map((u) => u.id),
    totalSlots: saved.length,
    note: '投稿計画を保存しました。下書きや投稿予約は作成していません。plan_gaps で空き枠を確認できます。',
  };
}

export async function opUpsertSeries(ctx: AgentCtx, input: { series: SlotInput; dryRun?: boolean; characterId?: string }) {
  return opUpsertPlan(ctx, { slots: [input.series], dryRun: input.dryRun, characterId: input.characterId });
}

// ===== 下書き編集（下書きのみ） =====

export async function opUpdateDraft(
  ctx: AgentCtx,
  input: { jobId: string; content?: string; scheduledAt?: string; tags?: string[]; topic?: string; mediaUrls?: string[]; characterId?: string },
) {
  await assertTarget(ctx, input.characterId);
  const j = await getScheduledJob(ctx.uid, input.jobId);
  if (!j || (j.personaId && j.personaId !== ctx.personaId)) throw new Error('投稿が見つかりません');
  if (j.status !== 'draft') {
    throw new Error(`状態が「${j.status}」の投稿は変更できません。AIが編集できるのは下書き(draft)だけです。承認・予約済みの投稿はバジットの画面で編集してください。`);
  }
  const patch: Parameters<typeof updateScheduledJob>[2] = {};
  const before = { text: jobText(j).slice(0, 80), scheduledAt: j.scheduledAt, tags: j.tags ?? [] };
  if (input.content !== undefined) {
    if (!input.content.trim()) throw new Error('content が空です');
    const first = j.contents[0];
    patch.contents = [{ ...first, content: input.content.slice(0, 5000) }, ...j.contents.slice(1)];
  }
  if (input.scheduledAt !== undefined) {
    const t = new Date(input.scheduledAt);
    if (Number.isNaN(t.getTime()) || t.getTime() <= Date.now()) throw new Error('scheduledAt は未来の日時（ISO8601）で指定してください');
    patch.scheduledAt = t.toISOString();
  }
  if (input.tags !== undefined) patch.tags = normTags(input.tags);
  if (input.topic !== undefined) patch.topic = input.topic.slice(0, 80);
  if (input.mediaUrls !== undefined) patch.mediaUrls = input.mediaUrls.filter((u) => /^https:\/\//.test(u)).slice(0, 6);
  if (!Object.keys(patch).length) throw new Error('変更内容がありません');
  const updated = await updateScheduledJob(ctx.uid, j.id, patch);
  if (!updated) throw new Error('更新できませんでした');
  const warnings = lintPost(jobText(updated), { platform: platformOf(updated), mediaUrls: updated.mediaUrls }).map((i) => `[${i.rule}] ${i.message}`);
  await writeAuditLog(ctx.uid, 'agent.draft.update', `${j.id}`, { jobId: j.id });
  return {
    success: true,
    jobId: j.id,
    status: updated.status,
    changed: Object.keys(patch),
    before,
    after: { text: jobText(updated).slice(0, 80), scheduledAt: updated.scheduledAt, tags: updated.tags ?? [] },
    warnings,
    note: '下書きを更新しました。投稿はされていません。',
  };
}

// ===== 実績（手入力・CSV） =====

const METRIC_KEYS = ['impressions', 'likes', 'reposts', 'replies', 'quotes', 'bookmarks', 'urlClicks', 'profileClicks', 'newFollows', 'shares', 'reach', 'saved'] as const;
type MetricKey = (typeof METRIC_KEYS)[number];
export type MetricsInput = Partial<Record<MetricKey, number>>;

function cleanMetrics(m: Record<string, unknown>): MetricsInput {
  const out: MetricsInput = {};
  for (const k of METRIC_KEYS) {
    const v = m[k];
    if (v === undefined || v === null || v === '') continue;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s]/g, ''));
    if (Number.isFinite(n) && n >= 0) out[k] = Math.round(n);
  }
  return out;
}

function insightDocId(jobId: string, platform: string, externalId: string): string {
  return `${jobId}_${platform}_${externalId}`.replace(/[/\\#?[\]]/g, '_').slice(0, 700);
}

function snapshotLabel(postedAtMs: number, nowMs: number): string {
  const h = (nowMs - postedAtMs) / 3600000;
  if (h < 36) return '24h';
  if (h < 120) return '72h';
  if (h < 14 * 24) return '7d';
  if (h < 45 * 24) return '28d';
  return 'later';
}

/** 1投稿の実績を保存（手入力）。未入力の指標は保存しない（0 とは区別される） */
export async function saveManualMetrics(
  ctx: AgentCtx,
  input: { jobId: string; metrics: Record<string, unknown>; label?: string; externalId?: string; capturedAt?: string },
) {
  const job = await getScheduledJob(ctx.uid, input.jobId);
  if (!job || (job.personaId && job.personaId !== ctx.personaId)) throw new Error('投稿が見つかりません');
  if (job.status !== 'published' && job.status !== 'notified') throw new Error('投稿済みの投稿にだけ実績を保存できます');
  const m = cleanMetrics(input.metrics);
  if (m.impressions === undefined) throw new Error('インプレッションは必須です');
  const result = job.publishResults?.find((r) => r.success && r.externalId);
  const platform = platformOf(job) === 'x_thread' ? 'x' : platformOf(job);
  const externalId = input.externalId || result?.externalId || job.id;
  const capturedAt = input.capturedAt && !Number.isNaN(new Date(input.capturedAt).getTime()) ? new Date(input.capturedAt) : new Date();
  const label = input.label || snapshotLabel(new Date(job.scheduledAt).getTime(), capturedAt.getTime());
  const id = insightDocId(job.id, platform, externalId);
  const ref = db().collection('users').doc(ctx.uid).collection('postInsights').doc(id);
  const prev = (await ref.get()).data() as PostInsightDoc | undefined;
  const snaps = (prev?.snapshots ?? []).filter((s) => s.label !== label);
  snaps.push({ label, capturedAt: capturedAt.toISOString(), impressions: m.impressions, likes: m.likes, reposts: m.reposts, replies: m.replies, bookmarks: m.bookmarks, urlClicks: m.urlClicks, profileClicks: m.profileClicks });
  await upsertPostInsight(ctx.uid, {
    id,
    jobId: job.id,
    platform,
    externalId,
    impressions: m.impressions,
    reach: m.reach,
    likes: m.likes,
    replies: m.replies,
    reposts: m.reposts,
    quotes: m.quotes,
    bookmarks: m.bookmarks,
    saved: m.saved,
    urlClicks: m.urlClicks,
    profileClicks: m.profileClicks,
    newFollows: m.newFollows,
    shares: m.shares,
    snapshots: snaps.slice(-8),
    fetchedAt: capturedAt.toISOString(),
    source: 'manual',
    lastError: '',
    scheduledAt: job.scheduledAt,
    preview: jobText(job).replace(/\s+/g, ' ').trim().slice(0, 80),
    personaId: job.personaId ?? ctx.personaId,
  } as Omit<PostInsightDoc, 'uid'>);
  return { id, label };
}

/** CSV（カンマ/タブ区切り・引用符対応） */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, '');
  const firstLine = t.split(/\r?\n/, 1)[0] ?? '';
  const delim = firstLine.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

type ColKey = MetricKey | 'postId' | 'link' | 'text' | 'date';

function detectColumn(header: string): ColKey | null {
  const h = header.toLowerCase().replace(/\s+/g, '');
  if (!h) return null;
  if (/(link|リンク|permalink)/.test(h) && !/click|クリック/.test(h)) return 'link';
  if (/(postid|tweetid|ポストid|ツイートid|ポストｉｄ|^id$)/.test(h)) return 'postId';
  if (/(text|テキスト|本文)/.test(h)) return 'text';
  if (/(^date$|日付|日時|time)/.test(h)) return 'date';
  if (/(impression|インプレッション)/.test(h)) return 'impressions';
  if (/(like|いいね)/.test(h)) return 'likes';
  if (/(bookmark|ブックマーク)/.test(h)) return 'bookmarks';
  if (/(repl|返信)/.test(h)) return 'replies';
  if (/(quote|引用)/.test(h)) return 'quotes';
  if (/(repost|retweet|リポスト|リツイート)/.test(h)) return 'reposts';
  if (/(share|共有)/.test(h)) return 'shares';
  if (/(profile|プロフィール)/.test(h)) return 'profileClicks';
  if (/(newfollow|新しいフォロー|フォロー)/.test(h)) return 'newFollows';
  if (/(urlclick|urlのクリック|url)/.test(h)) return 'urlClicks';
  return null;
}

function normText(t: string) {
  return t.toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[\s\u3000、。，．,.!！?？「」『』()（）\-ー・#＃@]/g, '');
}

function bigramSim(a: string, b: string) {
  const grams = (s: string) => { const o = new Set<string>(); for (let i = 0; i < s.length - 1; i++) o.add(s.slice(i, i + 2)); return o; };
  const A = grams(normText(a));
  const B = grams(normText(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

/** X のアナリティクスCSV（無料エクスポート）を取り込み、投稿済みの投稿に紐づけて保存する */
export async function importXCsv(ctx: AgentCtx, csv: string, opts: { label?: string } = {}) {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error('CSVにデータ行がありません');
  const cols = rows[0].map(detectColumn);
  if (!cols.includes('impressions')) throw new Error('「インプレッション」の列が見つかりません。X の分析画面からエクスポートしたCSVを使ってください');
  const jobs = (await getScheduledJobs(ctx.uid, ['published', 'notified'], ctx.personaId, 500)).filter((j) => platformOf(j) === 'x_thread' || j.publishMode === 'x_free');
  const byExt = new Map<string, ScheduledJobDoc>();
  for (const j of jobs) for (const r of j.publishResults ?? []) if (r.success && r.externalId) byExt.set(String(r.externalId), j);
  const used = new Set<string>();
  let matched = 0;
  const unmatched: Array<{ text: string; reason: string }> = [];
  const matches: Array<{ jobId: string; by: 'id' | 'text' }> = [];
  for (const r of rows.slice(1)) {
    const rec: Partial<Record<ColKey, string>> = {};
    cols.forEach((c, i) => { if (c && rec[c] === undefined) rec[c] = r[i]; });
    const text = (rec.text ?? '').trim();
    const idFromLink = rec.link?.match(/status\/(\d+)/)?.[1];
    const postId = (rec.postId ?? idFromLink ?? '').replace(/\D/g, '') || idFromLink || '';
    let job: ScheduledJobDoc | undefined;
    let by: 'id' | 'text' = 'id';
    if (postId) job = byExt.get(postId);
    if (!job && text) {
      by = 'text';
      let best = 0;
      for (const j of jobs) {
        if (used.has(j.id)) continue;
        const s = bigramSim(text, jobText(j));
        if (s > best) { best = s; job = j; }
      }
      if (best < 0.7) job = undefined;
    }
    if (!job) {
      unmatched.push({ text: text.slice(0, 40), reason: 'バジットで投稿した履歴に一致しません（別の方法で投稿した可能性）' });
      continue;
    }
    const metrics = cleanMetrics(Object.fromEntries(METRIC_KEYS.map((k) => [k, rec[k as ColKey]])));
    if (metrics.impressions === undefined) {
      unmatched.push({ text: text.slice(0, 40), reason: 'インプレッションが読み取れません' });
      continue;
    }
    used.add(job.id);
    await saveManualMetrics(ctx, {
      jobId: job.id,
      metrics,
      label: opts.label,
      externalId: job.publishResults?.find((x) => x.success && x.externalId)?.externalId ?? (postId || undefined),
      capturedAt: undefined,
    });
    matches.push({ jobId: job.id, by });
    matched++;
  }
  await writeAuditLog(ctx.uid, 'metrics.import.csv', `一致${matched}/未一致${unmatched.length}`, { personaId: ctx.personaId });
  return { matched, unmatched: unmatched.length, unmatchedSamples: unmatched.slice(0, 10), total: rows.length - 1, matches: matches.slice(0, 50) };
}

// ===== 実績の参照・分析 =====

const num = (v?: number) => (typeof v === 'number' ? v : undefined);

function derived(i: PostInsightDoc) {
  const eng = (num(i.likes) ?? 0) + (num(i.replies) ?? 0) + (num(i.reposts) ?? 0) + (num(i.quotes) ?? 0) + (num(i.bookmarks) ?? 0);
  const per = (v?: number) => (v !== undefined && i.impressions > 0 ? Math.round((v / i.impressions) * 10000) / 10 : undefined);
  return {
    engagements: eng,
    per1000: {
      engagements: per(eng),
      likes: per(i.likes),
      reposts: per(i.reposts),
      replies: per(i.replies),
      bookmarks: per(i.bookmarks),
      urlClicks: per(i.urlClicks),
    },
  };
}

async function insightsByJob(ctx: AgentCtx): Promise<Map<string, PostInsightDoc>> {
  const list = await listPostInsights(ctx.uid, { limit: 500 }).catch(() => []);
  const m = new Map<string, PostInsightDoc>();
  for (const p of list) {
    if (p.lastError) continue;
    if (p.personaId && p.personaId !== ctx.personaId) continue;
    const prev = m.get(p.jobId);
    if (!prev || p.impressions > prev.impressions) m.set(p.jobId, p);
  }
  return m;
}

export async function opGetPostMetrics(ctx: AgentCtx, jobId: string) {
  const j = await getScheduledJob(ctx.uid, jobId);
  if (!j || (j.personaId && j.personaId !== ctx.personaId)) throw new Error('投稿が見つかりません');
  const ins = (await insightsByJob(ctx)).get(jobId);
  if (!ins) {
    return { post: brief(j), metrics: null, status: '未取得', note: '実績が未登録です（0ではありません）。バジットの投稿履歴から手入力、またはXの分析CSVを取り込むと保存されます。' };
  }
  const missing = METRIC_KEYS.filter((k) => (ins as unknown as Record<string, unknown>)[k] === undefined);
  return {
    post: { ...brief(j, ins.impressions), xUrl: externalUrl(j) },
    metrics: { ...Object.fromEntries(METRIC_KEYS.map((k) => [k, (ins as unknown as Record<string, unknown>)[k] ?? null])), source: ins.source, capturedAt: ins.fetchedAt },
    derived: derived(ins),
    snapshots: ins.snapshots ?? [],
    notObtained: missing,
    note: 'null は「未取得」で、0 ではありません。',
  };
}

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

interface Row {
  job: ScheduledJobDoc;
  ins: PostInsightDoc;
  series: string;
  weekday: string;
  hour: number;
  media: string;
  hasUrl: boolean;
  format: string;
}

function seriesOf(job: ScheduledJobDoc, slots: PlanSlot[]): string {
  const p = jstParts(new Date(job.scheduledAt).getTime());
  const mins = (() => { const d = new Date(new Date(job.scheduledAt).getTime() + 9 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes(); })();
  const plat = platformOf(job);
  let best: PlanSlot | undefined;
  let bestDiff = 61;
  for (const s of slots) {
    if (s.weekday !== p.weekday || s.platform !== plat) continue;
    const [h, m] = s.time.split(':').map(Number);
    const diff = Math.abs(h * 60 + m - mins);
    if (diff < bestDiff) { best = s; bestDiff = diff; }
  }
  return best ? best.seriesName || best.theme || '(名称未設定の枠)' : '計画外';
}

async function buildRows(ctx: AgentCtx, days: number, platform?: string) {
  const since = Date.now() - days * 86400000;
  const [jobs, ins, slots] = await Promise.all([
    getScheduledJobs(ctx.uid, ['published', 'notified'], ctx.personaId, 500),
    insightsByJob(ctx),
    getPostingPlan(ctx.uid, ctx.personaId),
  ]);
  const inRange = jobs.filter((j) => new Date(j.scheduledAt).getTime() >= since).filter((j) => !platform || platformOf(j) === platform);
  const rows: Row[] = [];
  for (const job of inRange) {
    const i = ins.get(job.id);
    if (!i) continue;
    const p = jstParts(new Date(job.scheduledAt).getTime());
    const urls = job.mediaUrls ?? [];
    const media = !urls.length ? '画像・動画なし' : urls.some((u) => /\.(mp4|mov|webm)(\?|$)/i.test(u)) ? '動画あり' : '画像あり';
    rows.push({
      job,
      ins: i,
      series: seriesOf(job, slots),
      weekday: WEEKDAYS[p.weekday],
      hour: p.hour,
      media,
      hasUrl: /https?:\/\//.test(jobText(job)),
      format: jobText(job).includes('\n---\n') ? 'スレッド' : '単発',
    });
  }
  return { rows, publishedCount: inRange.length, slots };
}

function group(rows: Row[], key: (r: Row) => string[]) {
  const m = new Map<string, Row[]>();
  for (const r of rows) for (const k of key(r)) m.set(k, [...(m.get(k) ?? []), r]);
  return [...m.entries()]
    .map(([k, list]) => {
      const imps = list.map((r) => r.ins.impressions);
      const sum = (f: (i: PostInsightDoc) => number | undefined) => {
        const vals = list.map((r) => f(r.ins)).filter((v): v is number => v !== undefined);
        const impsFor = list.filter((r) => f(r.ins) !== undefined).reduce((n, r) => n + r.ins.impressions, 0);
        return vals.length && impsFor > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / impsFor) * 10000) / 10 : null;
      };
      return {
        key: k,
        posts: list.length,
        avgImpressions: Math.round(imps.reduce((a, b) => a + b, 0) / list.length),
        medianImpressions: median(imps),
        per1000: {
          likes: sum((i) => i.likes),
          reposts: sum((i) => i.reposts),
          bookmarks: sum((i) => i.bookmarks),
          urlClicks: sum((i) => i.urlClicks),
        },
        lowSample: list.length < 5,
      };
    })
    .sort((a, b) => b.avgImpressions - a.avgImpressions);
}

export async function buildBreakdown(ctx: AgentCtx, q: { days?: number; platform?: string } = {}) {
  const days = q.days ?? 90;
  const { rows, publishedCount } = await buildRows(ctx, days, q.platform);
  return {
    periodDays: days,
    coverage: {
      publishedPosts: publishedCount,
      measuredPosts: rows.length,
      unmeasuredPosts: publishedCount - rows.length,
      note: publishedCount - rows.length > 0 ? `実績が未登録の投稿が ${publishedCount - rows.length} 件あります（分析に含めていません。0として扱っていません）。` : '全投稿の実績があります。',
    },
    overall: rows.length
      ? { avgImpressions: Math.round(rows.reduce((n, r) => n + r.ins.impressions, 0) / rows.length), medianImpressions: median(rows.map((r) => r.ins.impressions)) }
      : null,
    bySeries: group(rows, (r) => [r.series]),
    byWeekday: group(rows, (r) => [r.weekday]),
    byHour: group(rows, (r) => [`${String(r.hour).padStart(2, '0')}時台`]),
    byMedia: group(rows, (r) => [r.media]),
    byUrl: group(rows, (r) => [r.hasUrl ? 'URLあり' : 'URLなし']),
    byFormat: group(rows, (r) => [r.format]),
    byTag: group(rows, (r) => r.job.tags ?? []).slice(0, 15),
    caution: '「少数サンプル」(lowSample=true) は投稿が5件未満で、傾向を断定できません。per1000 は1,000表示あたりの数で、実績が入力されている投稿だけで計算しています。',
  };
}

export async function opGetSeriesReport(ctx: AgentCtx, q: { days?: number; seriesName?: string }) {
  const b = await buildBreakdown(ctx, { days: q.days });
  const series = q.seriesName ? b.bySeries.filter((s) => s.key === q.seriesName) : b.bySeries;
  return { periodDays: b.periodDays, coverage: b.coverage, overall: b.overall, series, caution: b.caution };
}

/** 週次レポート（実データのみ。理由は「仮説」として分けて返す。データが無い項目は創作しない） */
export async function opWeeklyReport(ctx: AgentCtx) {
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const { rows, publishedCount } = await buildRows(ctx, 35);
  const thisWeek = rows.filter((r) => new Date(r.job.scheduledAt).getTime() >= weekAgo);
  const prev = rows.filter((r) => new Date(r.job.scheduledAt).getTime() < weekAgo);
  const allJobs = await getScheduledJobs(ctx.uid, ['published', 'notified'], ctx.personaId, 500);
  const postsThisWeek = allJobs.filter((j) => new Date(j.scheduledAt).getTime() >= weekAgo).length;
  const sumImp = (r: Row[]) => r.reduce((n, x) => n + x.ins.impressions, 0);
  const avg = (r: Row[]) => (r.length ? Math.round(sumImp(r) / r.length) : null);
  const isProduct = (r: Row) => /製品|サービス|導入|メディト/.test(`${(r.job.tags ?? []).join(' ')} ${r.series}`);
  const share = (all: Row[]) => (all.length ? Math.round((all.filter(isProduct).length / all.length) * 100) : null);
  const facts = (r: Row) => ({ ...brief(r.job, r.ins.impressions), series: r.series, weekday: r.weekday, hourJst: r.hour, media: r.media, hasUrl: r.hasUrl, per1000: derived(r.ins).per1000 });
  const sorted = [...thisWeek].sort((a, b) => b.ins.impressions - a.ins.impressions);
  const prevSeries = group(prev, (r) => [r.series]);
  const thisSeries = group(thisWeek, (r) => [r.series]);
  const hypotheses: string[] = [];
  for (const s of thisSeries) {
    const p = prevSeries.find((x) => x.key === s.key);
    if (p && p.posts >= 3 && s.avgImpressions > p.avgImpressions * 1.3) hypotheses.push(`「${s.key}」は直近4週平均より表示が増えています（今週${s.avgImpressions} / 4週平均${p.avgImpressions}）。続ける価値がある可能性があります（仮説）。`);
    if (p && p.posts >= 3 && s.avgImpressions < p.avgImpressions * 0.7) hypotheses.push(`「${s.key}」は直近4週平均より表示が減っています（今週${s.avgImpressions} / 4週平均${p.avgImpressions}）。時刻や形式を1つだけ変えて試す余地があります（仮説）。`);
  }
  return {
    period: { from: new Date(weekAgo).toISOString().slice(0, 10), to: new Date(now).toISOString().slice(0, 10) },
    facts: {
      postsThisWeek,
      measuredThisWeek: thisWeek.length,
      unmeasuredThisWeek: Math.max(0, postsThisWeek - thisWeek.length),
      totalImpressionsThisWeek: thisWeek.length ? sumImp(thisWeek) : null,
      avgImpressionsThisWeek: avg(thisWeek),
      avgImpressionsPrev4Weeks: avg(prev),
      productPostSharePctThisWeek: share(thisWeek),
      productPostSharePctPrev4Weeks: share(prev),
      topPosts: sorted.slice(0, 3).map(facts),
      lowestPosts: sorted.length > 3 ? sorted.slice(-3).reverse().map(facts) : [],
      bySeriesThisWeek: thisSeries,
    },
    hypotheses: hypotheses.length ? hypotheses : ['週あたりの実績が少ないため、傾向の仮説は出していません。実績の入力を増やすと提案できます。'],
    dataGaps: [
      publishedCount === 0 ? '直近の投稿済みデータがありません。' : null,
      postsThisWeek > thisWeek.length ? `今週の投稿のうち ${postsThisWeek - thisWeek.length} 件は実績未登録のため集計に含めていません。` : null,
      'サイト流入・問い合わせは、UTM付きURLとアクセス解析(GA4等)の数値を人が確認してください。',
    ].filter(Boolean),
    note: 'facts は登録済みの実データ、hypotheses はルールベースの仮説です（原因の断定ではありません）。計画の変更は人が承認して適用してください。',
  };
}

// ===== 利用量・ログ・UTM =====

export async function opGetApiUsage(ctx: AgentCtx) {
  const [p, settings, ins] = await Promise.all([getPersona(ctx.personaId), getUserSettings(ctx.uid), listPostInsights(ctx.uid, { limit: 500 }).catch(() => [])]);
  const mine = ins.filter((i) => !i.personaId || i.personaId === ctx.personaId);
  const bySource: Record<string, number> = {};
  for (const i of mine) bySource[i.source] = (bySource[i.source] ?? 0) + 1;
  return {
    x: {
      autoMetricsFetch: (p?.xInsightsEnabled ?? settings.xInsightsEnabled) === true ? 'ON（X APIの読み取り従量課金の対象）' : 'OFF（費用なし）',
      postsThisMonth: p?.xApiPostsThisMonth ?? null,
      postsMonthKey: p?.xApiPostsMonthKey ?? null,
    },
    metricsRecords: { total: mine.length, bySource },
    guidance: 'Xの実績は、バジットの「手入力」またはX分析画面のCSV取り込みで保存でき、API費用はかかりません。自動取得（ON）にすると読み取り費用が発生する場合があります。',
    notTracked: 'AIの文章・画像生成費用はChatGPT等の契約側で発生し、バジットでは計測していません。',
  };
}

export async function opGetOperationLogs(ctx: AgentCtx, limit = 30) {
  const logs = await listAuditLogs(ctx.uid, Math.min(100, Math.max(1, limit)));
  return {
    logs: logs.filter((l) => /^(agent|metrics|insights|schedule|publish)/.test(l.action) || /fail|error/i.test(l.action)).map((l) => ({ at: l.createdAt, action: l.action, detail: l.detail, meta: l.meta })),
  };
}

export function buildUtmUrl(input: { url: string; seriesId?: string; jobId?: string; platform?: string; campaign?: string; content?: string }) {
  const u = new URL(input.url);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('http(s) のURLを指定してください');
  for (const k of ['email', 'name', 'patient', 'patient_id', 'tel']) if (u.searchParams.has(k)) throw new Error('URLに個人情報になり得るパラメータが含まれています。取り除いてください');
  u.searchParams.set('utm_source', (input.platform || 'x').replace(/_thread$/, ''));
  u.searchParams.set('utm_medium', 'organic_social');
  const campaign = input.campaign || input.seriesId;
  if (campaign) u.searchParams.set('utm_campaign', campaign);
  const content = input.content || input.jobId;
  if (content) u.searchParams.set('utm_content', content);
  return { url: u.toString(), note: 'UTMにはシリーズIDや投稿IDなど個人情報を含まない値だけを使います。アクセス解析（GA4等）で utm_campaign / utm_content を確認してください。' };
}

// ===== 画面用 REST（ログインユーザー） =====

export const extrasRouter = Router();

async function restCtx(req: AuthedRequest): Promise<AgentCtx> {
  return { uid: req.uid!, personaId: await resolveActivePersonaId(req.uid!) };
}

extrasRouter.post('/manual', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const ctx = await restCtx(req);
    await assertPersonaAccess(ctx.personaId, ctx.uid, 'editor');
    const b = req.body as { jobId?: string; metrics?: Record<string, unknown>; label?: string };
    if (!b.jobId || !b.metrics) throw new Error('jobId と metrics が必要です');
    const r = await saveManualMetrics(ctx, { jobId: b.jobId, metrics: b.metrics, label: b.label });
    await writeAuditLog(ctx.uid, 'metrics.manual', b.jobId, { personaId: ctx.personaId });
    res.json({ success: true, ...r });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '保存に失敗しました' });
  }
});

extrasRouter.post('/import-csv', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const ctx = await restCtx(req);
    await assertPersonaAccess(ctx.personaId, ctx.uid, 'editor');
    const b = req.body as { csv?: string; label?: string };
    if (!b.csv || b.csv.length > 2_000_000) throw new Error('CSVが空、または大きすぎます');
    res.json({ success: true, ...(await importXCsv(ctx, b.csv, { label: b.label })) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '取り込みに失敗しました' });
  }
});

extrasRouter.get('/breakdown', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const ctx = await restCtx(req);
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 90));
    res.json(await buildBreakdown(ctx, { days }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '取得に失敗しました' });
  }
});

extrasRouter.get('/weekly', requireAuth, async (req: AuthedRequest, res) => {
  try {
    res.json(await opWeeklyReport(await restCtx(req)));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '取得に失敗しました' });
  }
});
