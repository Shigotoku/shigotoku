/**
 * AI エージェント（MCP サーバー等）向け API。
 * - 認証: Firestore に保存した API キー（SHA-256 ハッシュ）。キーは uid と配信キャラに紐づく。
 * - 安全設計: 書き込みは「ネタ追加」と「下書き作成」だけ。承認・予約確定・投稿はできない。
 */
import { createHash, randomBytes } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { createScheduledJob, getScheduledJobs, getScheduledJob, listPostInsights, getPostingPlan, savePostingPlan, getUserSettings, type PlanSlot, type ScheduledJobDoc } from './firestore';
import { postToSlackWebhook } from './slack';
import { lintPost } from './postLint';
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { uploadBufferToGcp, createSignedUploadUrl } from './storage';
import { ACCEPTED_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from './repurpose';
import { TARGET_PLATFORMS, parseSource, adaptForPlatform, type TargetPlatform } from './crosspostRules';
import { addIdeaInbox, listIdeaInbox, writeAuditLog } from './productExtras';
import { assertPersonaAccess, getPersona, resolveActivePersonaId } from './personas';
import type { ScheduledJobStatus } from '../types/schedule';

export interface AgentRequest extends Request {
  agent?: { uid: string; personaId: string; keyId: string };
}

export const APP_ORIGIN = process.env.BUZZIT_APP_ORIGIN ?? 'https://app.buzzit.shigotoku.com';
const KEY_PREFIX = 'bzk_';
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

const accessCache = new Map<string, number>();
/** キー発行後にチーム権限を失った・キャラが削除された場合に、古いキーで操作できないよう60秒ごとに再確認する */
async function stillAllowed(uid: string, personaId: string): Promise<boolean> {
  const k = `${uid}|${personaId}`;
  const hit = accessCache.get(k);
  if (hit && Date.now() - hit < 60_000) return true;
  try {
    await assertPersonaAccess(personaId, uid, 'editor');
    accessCache.set(k, Date.now());
    return true;
  } catch {
    accessCache.delete(k);
    return false;
  }
}

export async function requireAgentKey(req: AgentRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token.startsWith(KEY_PREFIX)) {
    res
      .status(401)
      .set('WWW-Authenticate', `Bearer resource_metadata="${APP_ORIGIN}/.well-known/oauth-protected-resource"`)
      .json({ error: 'APIキーが必要です' });
    return;
  }
  try {
    const snap = await getFirestore()
      .collectionGroup('apiKeys')
      .where('hash', '==', sha256(token))
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc || doc.data().revoked) {
      res.status(401).json({ error: 'APIキーが無効です' });
      return;
    }
    const uid = doc.ref.parent.parent?.id;
    if (!uid) {
      res.status(401).json({ error: 'APIキーが無効です' });
      return;
    }
    const personaId = String(doc.data().personaId);
    if (!(await stillAllowed(uid, personaId))) {
      res.status(403).json({ error: 'この接続のキャラへのアクセス権がなくなりました。設定のAI連携で接続を解除し、接続し直してください' });
      return;
    }
    req.agent = { uid, personaId, keyId: doc.id };
    doc.ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});
    next();
  } catch (err) {
    console.error('agent key lookup failed', err);
    res.status(500).json({ error: '認証に失敗しました' });
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s\u3000、。，．,.!！?？「」『』()（）\-ー・]/g, '');
}

function bigrams(text: string): Set<string> {
  const s = normalize(text);
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** 文字 2-gram の Jaccard 類似度（0〜1） */
function similarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

export const agentRouter = Router();

/** API キー発行（キー画面・OAuth 共通）。平文は返却時のみ。 */
export async function issueApiKey(uid: string, personaId: string, label: string) {
  const key = KEY_PREFIX + randomBytes(24).toString('hex');
  const ref = await getFirestore()
    .collection('users')
    .doc(uid)
    .collection('apiKeys')
    .add({
      hash: sha256(key),
      label: label.slice(0, 60),
      personaId,
      revoked: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  await writeAuditLog(uid, 'agent_key.create', `${label} persona=${personaId}`);
  return { id: ref.id, apiKey: key };
}

// ---- キー管理（アプリにログインした本人が操作） ----
agentRouter.post('/keys', requireAuth, async (req: AuthedRequest, res) => {
  const { label, personaId } = req.body as { label?: string; personaId?: string };
  try {
    const pid = personaId ?? (await resolveActivePersonaId(req.uid!));
    await assertPersonaAccess(pid, req.uid!, 'editor');
    const { id, apiKey: key } = await issueApiKey(req.uid!, pid, label ?? 'AI連携');
    res.json({
      id,
      personaId: pid,
      apiKey: key,
      note: 'このキーは今回しか表示されません。安全な場所に保存してください。',
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'キーの作成に失敗しました' });
  }
});

agentRouter.get('/keys', requireAuth, async (req: AuthedRequest, res) => {
  const snap = await getFirestore().collection('users').doc(req.uid!).collection('apiKeys').get();
  res.json({
    keys: snap.docs.map((d) => {
      const x = d.data();
      const last = x.lastUsedAt && typeof x.lastUsedAt.toDate === 'function' ? x.lastUsedAt.toDate().toISOString() : null;
      return { id: d.id, label: x.label, personaId: x.personaId, revoked: !!x.revoked, lastUsedAt: last };
    }),
  });
});

agentRouter.delete('/keys/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ref = getFirestore().collection('users').doc(req.uid!).collection('apiKeys').doc(String(req.params.id));
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: 'キーが見つかりません' });
    return;
  }
  await ref.update({ revoked: true });
  await writeAuditLog(req.uid!, 'agent_key.revoke', ref.id);
  res.json({ success: true });
});


// ---- 共通オペレーション（REST と リモートMCP の両方から使う） ----
export interface AgentCtx {
  uid: string;
  personaId: string;
}

export async function opListIdeas(ctx: AgentCtx) {
  return { ideas: await listIdeaInbox(ctx.uid) };
}

export async function opAddIdea(ctx: AgentCtx, text: string) {
  if (!text?.trim()) throw new Error('text が必要です');
  const idea = await addIdeaInbox(ctx.uid, { text: text.slice(0, 2000), author: 'AI', authorRole: 'ai' });
  await writeAuditLog(ctx.uid, 'agent.idea.add', text.slice(0, 60));
  return { idea };
}

export async function opListScheduled(ctx: AgentCtx, statusParam?: string) {
  const status = statusParam ? (statusParam.split(',') as ScheduledJobStatus[]) : undefined;
  const jobs = await getScheduledJobs(ctx.uid, status, ctx.personaId);
  return {
    jobs: jobs.map((j) => ({
      id: j.id,
      status: j.status,
      scheduledAt: j.scheduledAt,
      publishMode: j.publishMode,
      contents: j.contents,
      errorMessage: j.errorMessage,
    })),
  };
}

// ---- ヘルパー ----
export function normTags(tags?: string[]): string[] {
  return [...new Set((tags ?? []).map((t) => String(t).replace(/^[#＃]/, '').trim().slice(0, 30)).filter(Boolean))].slice(0, 10);
}

export function platformOf(job: ScheduledJobDoc): string {
  const p = job.contents[0]?.platform;
  if (p && (TARGET_PLATFORMS as string[]).includes(p)) return p;
  const map: Record<string, string> = { x_free: 'x_thread', meta: 'instagram', line: 'line', gbp: 'gbp' };
  return p || map[job.publishMode] || 'other';
}

export function externalUrl(job: ScheduledJobDoc): string | undefined {
  const r = job.publishResults?.find((x) => x.success && x.externalId);
  if (!r) return undefined;
  return r.platform.startsWith('x') ? `https://x.com/i/status/${r.externalId}` : undefined;
}

export function jobText(j: ScheduledJobDoc): string {
  return j.contents.map((c) => c.content).join('');
}

export function brief(j: ScheduledJobDoc, impressions?: number) {
  return {
    id: j.id,
    platform: platformOf(j),
    status: j.status,
    scheduledAt: j.scheduledAt,
    tags: j.tags ?? [],
    topic: j.topic,
    text: jobText(j).slice(0, 160),
    hasMedia: (j.mediaUrls?.length ?? 0) > 0,
    url: externalUrl(j),
    impressions,
    error: j.errorMessage,
  };
}

export async function impressionMap(uid: string): Promise<Map<string, number>> {
  try {
    const list = await listPostInsights(uid, { limit: 200 });
    return new Map(list.map((p) => [p.jobId, p.impressions]));
  } catch {
    return new Map();
  }
}

/** SSRF 対策: https かつ公開IPのみ許可 */
async function assertPublicHttps(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== 'https:') throw new Error('https の URL のみ指定できます');
  const addrs = await lookup(u.hostname, { all: true });
  for (const { address } of addrs) {
    const v4 = net.isIPv4(address);
    const priv = v4
      ? /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address)
      : /^(::1|fc|fd|fe80)/i.test(address);
    if (priv) throw new Error('この URL にはアクセスできません');
  }
  return u;
}

// ---- メディア ----
/** URL から取得、または base64 を受け取って保存し、公開URLを返す。動画は URL か get_upload_url を使う */
export async function opUploadMedia(
  _ctx: AgentCtx,
  input: { url?: string; base64?: string; contentType?: string; fileName?: string },
) {
  let buf: Buffer;
  let contentType = input.contentType ?? '';
  let fileName = input.fileName ?? 'media';
  if (input.url) {
    const u = await assertPublicHttps(input.url);
    const res = await fetch(u, { redirect: 'error' });
    if (!res.ok) throw new Error(`ダウンロードに失敗しました (${res.status})`);
    contentType = (res.headers.get('content-type') ?? contentType).split(';')[0].trim();
    buf = Buffer.from(await res.arrayBuffer());
    if (!input.fileName) fileName = u.pathname.split('/').pop() || 'media';
  } else if (input.base64) {
    buf = Buffer.from(input.base64.replace(/^data:[^,]+,/, ''), 'base64');
  } else {
    throw new Error('url または base64 が必要です');
  }
  if (!buf.length) throw new Error('ファイルが空です');
  if (!ACCEPTED_TYPES.has(contentType)) throw new Error(`対応していない形式です (${contentType || '不明'})`);
  const isVideo = contentType.startsWith('video/');
  if (buf.length > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) throw new Error('ファイルサイズが上限を超えています');
  const { publicUrl } = await uploadBufferToGcp(buf, fileName, contentType);
  return { mediaUrl: publicUrl, kind: isVideo ? 'video' : 'image', bytes: buf.length };
}

/** 大きい動画向け: 署名付きURLを返す。AI側が PUT でアップロードし、返った mediaUrl を下書きに渡す */
export async function opGetUploadUrl(_ctx: AgentCtx, input: { fileName: string; contentType: string }) {
  if (!ACCEPTED_TYPES.has(input.contentType)) throw new Error('対応していない形式です');
  const r = await createSignedUploadUrl(input.fileName, input.contentType);
  return {
    uploadUrl: r.uploadUrl,
    mediaUrl: r.publicUrl,
    howTo: `uploadUrl に PUT し、ヘッダー Content-Type: ${input.contentType} を付けて本体を送る（15分有効）。完了後 mediaUrl を create_draft の mediaUrls に渡す。`,
  };
}

// ---- 類似チェック・検索・タグ ----
/** 過去の投稿・予約・ネタとの類似チェック（ルールベース・AI不使用） */
export async function opCheckDuplicate(
  ctx: AgentCtx,
  text: string,
  opts: { platform?: string; tags?: string[] } = {},
) {
  if (!text?.trim()) throw new Error('text が必要です');
  const [jobs, ideas] = await Promise.all([
    getScheduledJobs(ctx.uid, undefined, ctx.personaId, 300),
    listIdeaInbox(ctx.uid),
  ]);
  const wantTags = normTags(opts.tags);
  const candidates = [
    ...jobs
      .filter((j) => !opts.platform || platformOf(j) === opts.platform)
      .map((j) => ({
        kind: 'scheduled' as const,
        id: j.id,
        status: j.status as string,
        platform: platformOf(j),
        tags: j.tags ?? [],
        scheduledAt: j.scheduledAt,
        text: jobText(j),
      })),
    ...ideas.map((i) => ({
      kind: 'idea' as const,
      id: i.id,
      status: i.status as string,
      platform: undefined as string | undefined,
      tags: [] as string[],
      scheduledAt: undefined as string | undefined,
      text: i.text,
    })),
  ];
  const matches = candidates
    .map((c) => ({
      ...c,
      score: Math.round(similarity(text, c.text) * 100) / 100,
      sharedTags: c.tags.filter((t) => wantTags.includes(t)),
    }))
    .filter((c) => c.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => ({ ...c, text: c.text.slice(0, 200) }));
  return {
    duplicate: matches.some((m) => m.score >= 0.5),
    matches,
    note: '文字の重なりによるルールベース判定です（0.5以上で重複の可能性が高い）。',
  };
}

/** 条件で過去の投稿を検索（キーワード・タグ・媒体・状態・期間） */
export async function opSearchPosts(
  ctx: AgentCtx,
  q: { query?: string; tags?: string[]; platform?: string; status?: string; days?: number; limit?: number },
) {
  const jobs = await getScheduledJobs(
    ctx.uid,
    q.status ? (q.status.split(',') as ScheduledJobStatus[]) : undefined,
    ctx.personaId,
    500,
  );
  const wantTags = normTags(q.tags);
  const since = q.days ? Date.now() - q.days * 86400000 : 0;
  const kw = q.query ? normalize(q.query) : '';
  const imp = await impressionMap(ctx.uid);
  const posts = jobs
    .filter((j) => !q.platform || platformOf(j) === q.platform)
    .filter((j) => !since || new Date(j.scheduledAt).getTime() >= since)
    .filter((j) => !wantTags.length || wantTags.every((t) => (j.tags ?? []).includes(t)))
    .filter((j) => !kw || normalize(jobText(j) + (j.topic ?? '')).includes(kw))
    .slice(0, Math.min(100, q.limit ?? 30))
    .map((j) => brief(j, imp.get(j.id)));
  return { count: posts.length, posts };
}

/**
 * タグ別の投稿実績。「同じタイプの投稿を過去にどう作ったか」「最近使っていない領域」を AI に渡すための材料。
 */
export async function opTagReport(ctx: AgentCtx, q: { platform?: string; days?: number }) {
  const days = q.days ?? 90;
  const since = Date.now() - days * 86400000;
  const all = await getScheduledJobs(ctx.uid, undefined, ctx.personaId, 500);
  const jobs = all
    .filter((j) => j.status !== 'failed')
    .filter((j) => !q.platform || platformOf(j) === q.platform)
    .filter((j) => new Date(j.scheduledAt).getTime() >= since);
  const imp = await impressionMap(ctx.uid);
  const byTag = new Map<string, ScheduledJobDoc[]>();
  let untagged = 0;
  for (const j of jobs) {
    const tags = j.tags ?? [];
    if (!tags.length) untagged++;
    for (const t of tags) byTag.set(t, [...(byTag.get(t) ?? []), j]);
  }
  const tags = [...byTag.entries()]
    .map(([tag, list]) => {
      const sorted = [...list].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
      const withImp = sorted.filter((j) => imp.has(j.id));
      return {
        tag,
        count: list.length,
        lastUsedAt: sorted[0].scheduledAt,
        daysSinceLast: Math.floor((Date.now() - new Date(sorted[0].scheduledAt).getTime()) / 86400000),
        avgImpressions: withImp.length
          ? Math.round(withImp.reduce((n, j) => n + (imp.get(j.id) ?? 0), 0) / withImp.length)
          : null,
        recent: sorted.slice(0, 3).map((j) => ({ id: j.id, scheduledAt: j.scheduledAt, text: jobText(j).slice(0, 80) })),
      };
    })
    .sort((a, b) => b.count - a.count);
  const topics = [...new Set(jobs.map((j) => j.topic).filter(Boolean))].slice(0, 50);
  return {
    periodDays: days,
    totalPosts: jobs.length,
    untagged,
    tags,
    notUsedRecently: tags.filter((t) => t.daysSinceLast >= 30).map((t) => t.tag),
    topicsCovered: topics,
    guidance:
      '使用回数が多いタグは避け、notUsedRecently や未使用の切り口で新しい投稿を作ること。作成前に check_duplicate で最終確認し、tags を付けて create_draft する。',
  };
}

export async function opGetPost(ctx: AgentCtx, jobId: string) {
  const j = await getScheduledJob(ctx.uid, jobId);
  if (!j || (j.personaId && j.personaId !== ctx.personaId)) throw new Error('投稿が見つかりません');
  const imp = await listPostInsights(ctx.uid, { limit: 200 }).catch(() => []);
  const insight = imp.find((p) => p.jobId === jobId);
  return {
    ...brief(j, insight?.impressions),
    contents: j.contents,
    mediaUrls: j.mediaUrls ?? [],
    publishResults: j.publishResults,
    insight: insight
      ? {
          impressions: insight.impressions,
          reach: insight.reach,
          likes: insight.likes,
          replies: insight.replies,
          reposts: insight.reposts,
          fetchedAt: insight.fetchedAt,
        }
      : null,
    sourceJobId: j.sourceJobId,
  };
}

/** 全体像: 状態別件数・媒体別件数・直近の投稿・失敗 */
export async function opOverview(ctx: AgentCtx) {
  const jobs = await getScheduledJobs(ctx.uid, undefined, ctx.personaId, 300);
  const imp = await impressionMap(ctx.uid);
  const byStatus: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  for (const j of jobs) {
    byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
    const p = platformOf(j);
    byPlatform[p] = (byPlatform[p] ?? 0) + 1;
  }
  const now = Date.now();
  const persona = await getPersona(ctx.personaId).catch(() => null);
  return {
    character: { id: ctx.personaId, name: persona?.name ?? null },
    totalJobs: jobs.length,
    note: jobs.length === 0 ? `このキャラ「${persona?.name ?? ctx.personaId}」にはまだ投稿・下書きがありません。意図したキャラか whoami / list_characters で確認してください（別のキャラで接続している可能性があります）。` : undefined,
    byStatus,
    byPlatform,
    upcoming: jobs
      .filter((j) => ['pending', 'pending_approval'].includes(j.status) && new Date(j.scheduledAt).getTime() >= now)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 10)
      .map((j) => brief(j)),
    drafts: jobs.filter((j) => j.status === 'draft').slice(0, 10).map((j) => brief(j)),
    recentPosted: jobs
      .filter((j) => j.status === 'published' || j.status === 'notified')
      .slice(0, 10)
      .map((j) => brief(j, imp.get(j.id))),
    failed: jobs.filter((j) => j.status === 'failed').slice(0, 10).map((j) => brief(j)),
  };
}

// ---- 下書き作成 ----
/** 下書き作成のみ。status は必ず draft で、ワーカーは draft を投稿しない。 */
export async function opCreateDraft(
  ctx: AgentCtx,
  input: {
    contents?: Array<{ platform?: string; label?: string; content?: string }>;
    scheduledAt?: string;
    mediaUrls?: string[];
    tags?: string[];
    topic?: string;
    sourceJobId?: string;
    silent?: boolean;
    aiGeneratedMedia?: boolean;
  },
) {
  const { contents, scheduledAt } = input;
  if (!Array.isArray(contents) || !contents.length || !scheduledAt) {
    throw new Error('contents と scheduledAt が必要です');
  }
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
    throw new Error('scheduledAt は未来の日時（ISO8601）で指定してください');
  }
  const items = contents.slice(0, 5).map((c) => {
    const platform = String(c.platform ?? 'x_thread');
    if (!(TARGET_PLATFORMS as string[]).includes(platform)) {
      throw new Error(`platform は ${TARGET_PLATFORMS.join(' / ')} のいずれかです`);
    }
    return {
      platform,
      label: String(c.label ?? '投稿').slice(0, 60),
      content: String(c.content ?? '').slice(0, 5000),
    };
  });
  if (items.some((i) => !i.content.trim())) throw new Error('content が空の項目があります');
  const mediaUrls = (input.mediaUrls ?? []).filter((u) => /^https:\/\//.test(u)).slice(0, 6);
  const warnings: string[] = [];
  const kind = items[0].platform;
  if ((kind === 'instagram' || kind === 'gbp') && !mediaUrls.length) warnings.push('この媒体は画像が必要です。upload_media で追加してください。');
  if ((kind === 'youtube_shorts' || kind === 'tiktok') && !mediaUrls.length) warnings.push('動画が必要です。get_upload_url / upload_media で追加してください。');
  for (const it of items) {
    for (const i of lintPost(it.content, { platform: it.platform, mediaUrls })) {
      warnings.push(`[${i.rule}] ${i.message}`);
    }
  }
  const jobId = await createScheduledJob(ctx.uid, {
    contents: items,
    scheduledAt: when.toISOString(),
    publishMode: 'notify',
    status: 'draft',
    personaId: ctx.personaId,
    mediaUrls,
    tags: normTags(input.tags),
    topic: input.topic?.slice(0, 80),
    sourceJobId: input.sourceJobId,
    createdBy: 'ai',
    aiGeneratedMedia: input.aiGeneratedMedia === true,
  });
  await writeAuditLog(ctx.uid, 'agent.draft.create', `${items.length}件`, { jobId });
  if (!input.silent) {
    getUserSettings(ctx.uid)
      .then((st) =>
        st.slackWebhookUrl
          ? postToSlackWebhook(
              st.slackWebhookUrl,
              `🤖 *AIが下書きを作成しました*（${items[0].label}）${items[0].content.slice(0, 120)}👉 ${APP_ORIGIN}/calendar`,
            )
          : undefined,
      )
      .catch(() => {});
  }
  return {
    success: true,
    jobId,
    status: 'draft',
    warnings,
    message: '下書きとして保存しました。バジットのカレンダーで確認・承認・予約してください。',
  };
}

/** 既存投稿（または文章）を、他SNSの形式に整えて下書き化。dryRun=true なら保存せずプレビューのみ */
export async function opAdaptPost(
  ctx: AgentCtx,
  input: {
    jobId?: string;
    text?: string;
    mediaUrls?: string[];
    targets: string[];
    scheduledAt?: string;
    tags?: string[];
    dryRun?: boolean;
  },
) {
  const targets = (input.targets ?? []).filter((t): t is TargetPlatform => (TARGET_PLATFORMS as string[]).includes(t));
  if (!targets.length) throw new Error(`targets は ${TARGET_PLATFORMS.join(' / ')} から指定してください`);
  let text = input.text ?? '';
  let media = input.mediaUrls ?? [];
  let tags = normTags(input.tags);
  let topic: string | undefined;
  if (input.jobId) {
    const j = await getScheduledJob(ctx.uid, input.jobId);
    if (!j || (j.personaId && j.personaId !== ctx.personaId)) throw new Error('元の投稿が見つかりません');
    text = jobText(j);
    media = media.length ? media : (j.mediaUrls ?? []);
    tags = tags.length ? tags : (j.tags ?? []);
    topic = j.topic;
  }
  if (!text.trim()) throw new Error('jobId または text が必要です');
  const src = parseSource(text, media);
  const results = targets.map((t) => adaptForPlatform(src, t, media));
  if (input.dryRun) return { dryRun: true, previews: results };
  if (!input.scheduledAt) throw new Error('scheduledAt が必要です（dryRun=true ならプレビューのみ）');
  const base = new Date(input.scheduledAt).getTime();
  const created: Array<{ platform: string; jobId: string; scheduledAt: string; warnings: string[] }> = [];
  for (const [i, r] of results.entries()) {
    // 同時刻に重ならないよう媒体ごとに30分ずらす
    const at = new Date(base + i * 30 * 60000).toISOString();
    const d = await opCreateDraft(ctx, {
      scheduledAt: at,
      contents: [{ platform: r.platform, label: r.label, content: r.content }],
      mediaUrls: r.mediaUrls,
      tags,
      topic,
      sourceJobId: input.jobId,
      silent: i > 0,
    });
    created.push({ platform: r.platform, jobId: d.jobId, scheduledAt: at, warnings: [...r.warnings, ...d.warnings] });
  }
  return { success: true, created, message: '各SNS向けの下書きを作成しました。メディア要件などの警告を確認してください。' };
}

/** 投稿文のルールベース簡易チェック（医療広告・景表法で問題になりやすい表現、媒体仕様） */
export async function opLintPost(_ctx: AgentCtx, input: { text: string; platform?: string; mediaUrls?: string[] }) {
  if (!input.text?.trim()) throw new Error('text が必要です');
  const issues = lintPost(input.text, { platform: input.platform, mediaUrls: input.mediaUrls });
  return { ok: !issues.some((i) => i.level === 'warn'), issues, note: '参考情報です。法的判断ではないため、最終確認は人が行ってください。' };
}

// ---- 投稿計画 ----
export async function opGetPlan(ctx: AgentCtx) {
  return { slots: await getPostingPlan(ctx.uid, ctx.personaId) };
}

const JST = 9 * 3600000;
export function jstParts(ms: number) {
  const d = new Date(ms + JST);
  return { date: d.toISOString().slice(0, 10), weekday: d.getUTCDay(), hour: d.getUTCHours() };
}

/** 投稿計画のうち、まだ投稿・下書きが入っていない枠を返す。AI はこの枠を create_draft で埋める */
export async function opPlanGaps(ctx: AgentCtx, q: { weeks?: number }) {
  const weeks = Math.min(8, Math.max(1, q.weeks ?? 2));
  const slots = (await getPostingPlan(ctx.uid, ctx.personaId)).filter((x) => x.active !== false);
  if (!slots.length) {
    return { gaps: [], note: '有効な投稿計画がありません。バジットの 設定 → 配信キャラ → 投稿計画 で枠を作るか、upsert_plan で登録してください（whoami で接続中のキャラを確認できます）。' };
  }
  const jobs = (await getScheduledJobs(ctx.uid, undefined, ctx.personaId, 500)).filter((j) => j.status !== 'failed');
  const used = new Map<string, number>();
  for (const j of jobs) {
    const key = `${jstParts(new Date(j.scheduledAt).getTime()).date}|${platformOf(j)}`;
    used.set(key, (used.get(key) ?? 0) + 1);
  }
  const gaps: Array<Record<string, unknown>> = [];
  const now = Date.now();
  const names = ['日', '月', '火', '水', '木', '金', '土'];
  for (let day = 0; day < weeks * 7; day++) {
    const dayMs = now + day * 86400000;
    const { date, weekday } = jstParts(dayMs);
    const todays = slots.filter((x) => x.weekday === weekday).sort((a, b) => a.time.localeCompare(b.time));
    const perPlatformUsed = new Map<string, number>();
    for (const slot of todays) {
      const key = `${date}|${slot.platform}`;
      const taken = (used.get(key) ?? 0) - (perPlatformUsed.get(key) ?? 0);
      if (taken > 0) {
        perPlatformUsed.set(key, (perPlatformUsed.get(key) ?? 0) + 1);
        continue;
      }
      const at = new Date(`${date}T${slot.time}:00+09:00`);
      if (at.getTime() <= now) continue;
      gaps.push({ slotId: slot.id, scheduledAt: at.toISOString(), weekday: names[weekday], platform: slot.platform, theme: slot.theme, tags: slot.tags ?? [], seriesName: slot.seriesName, purpose: slot.purpose, audience: slot.audience, tone: slot.tone, mediaKind: slot.mediaKind, rules: slot.rules, ngRules: slot.ngRules });
    }
  }
  return {
    count: gaps.length,
    gaps,
    note: '各枠の theme と tags に沿って、過去投稿と被らない内容で create_draft してください（scheduledAt はそのまま使う）。',
  };
}

// ---- 成果レポート（AIに「伸びた型」を渡す） ----
export async function opPerformance(ctx: AgentCtx, q: { platform?: string; days?: number }) {
  const since = Date.now() - (q.days ?? 180) * 86400000;
  const [jobs, imp] = await Promise.all([getScheduledJobs(ctx.uid, undefined, ctx.personaId, 500), impressionMap(ctx.uid)]);
  const rows = jobs
    .filter((j) => (j.status === 'published' || j.status === 'notified') && imp.has(j.id))
    .filter((j) => !q.platform || platformOf(j) === q.platform)
    .filter((j) => new Date(j.scheduledAt).getTime() >= since)
    .map((j) => ({ j, v: imp.get(j.id) ?? 0, p: jstParts(new Date(j.scheduledAt).getTime()) }));
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const group = <K extends string | number>(key: (r: (typeof rows)[number]) => K[]) => {
    const m = new Map<K, number[]>();
    for (const r of rows) for (const k of key(r)) m.set(k, [...(m.get(k) ?? []), r.v]);
    return [...m.entries()].map(([k, v]) => ({ key: k, posts: v.length, avgImpressions: avg(v) })).sort((a, b) => b.avgImpressions - a.avgImpressions);
  };
  const names = ['日', '月', '火', '水', '木', '金', '土'];
  return {
    measuredPosts: rows.length,
    overallAvg: avg(rows.map((r) => r.v)),
    topPosts: [...rows].sort((a, b) => b.v - a.v).slice(0, 5).map((r) => brief(r.j, r.v)),
    bestTags: group((r) => r.j.tags ?? []).slice(0, 8).map((x) => ({ tag: x.key, ...x, key: undefined })),
    byWeekday: group((r) => [names[r.p.weekday]]).map((x) => ({ weekday: x.key, posts: x.posts, avgImpressions: x.avgImpressions })),
    byHour: group((r) => [r.p.hour]).slice(0, 6).map((x) => ({ hourJst: x.key, posts: x.posts, avgImpressions: x.avgImpressions })),
    guidance: '平均インプレッションが高いタグ・曜日・時間帯を優先し、topPosts の型（書き出し・構成）を参考に、ただし内容が被らないよう check_duplicate で確認すること。',
  };
}

// ---- REST（APIキー認証） ----
function rest<T>(fn: (a: AgentCtx, req: AgentRequest) => Promise<T>) {
  return async (req: AgentRequest, res: Response) => {
    try {
      res.json(await fn({ uid: req.agent!.uid, personaId: req.agent!.personaId }, req));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '失敗しました' });
    }
  };
}

agentRouter.get('/ideas', requireAgentKey, rest((c) => opListIdeas(c)));
agentRouter.post('/ideas', requireAgentKey, rest((c, r) => opAddIdea(c, (r.body as { text?: string }).text ?? '')));
agentRouter.get('/scheduled', requireAgentKey, rest((c, r) => opListScheduled(c, typeof r.query.status === 'string' ? r.query.status : undefined)));
agentRouter.post('/check-duplicate', requireAgentKey, rest((c, r) => {
  const b = r.body as { text?: string; platform?: string; tags?: string[] };
  return opCheckDuplicate(c, b.text ?? '', { platform: b.platform, tags: b.tags });
}));
agentRouter.post('/search', requireAgentKey, rest((c, r) => opSearchPosts(c, r.body as Parameters<typeof opSearchPosts>[1])));
agentRouter.post('/tag-report', requireAgentKey, rest((c, r) => opTagReport(c, r.body as Parameters<typeof opTagReport>[1])));
agentRouter.get('/posts/:id', requireAgentKey, rest((c, r) => opGetPost(c, String(r.params.id))));
agentRouter.get('/overview', requireAgentKey, rest((c) => opOverview(c)));
agentRouter.post('/media', requireAgentKey, rest((c, r) => opUploadMedia(c, r.body as Parameters<typeof opUploadMedia>[1])));
agentRouter.post('/upload-url', requireAgentKey, rest((c, r) => opGetUploadUrl(c, r.body as Parameters<typeof opGetUploadUrl>[1])));
agentRouter.post('/adapt', requireAgentKey, rest((c, r) => opAdaptPost(c, r.body as Parameters<typeof opAdaptPost>[1])));
agentRouter.post('/drafts', requireAgentKey, rest((c, r) => opCreateDraft(c, r.body as Parameters<typeof opCreateDraft>[1])));

// ---- アプリ画面用: 作成中の文章の類似投稿チェック（ルールベース） ----
agentRouter.post('/similar', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const personaId = await resolveActivePersonaId(req.uid!);
    const b = req.body as { text?: string; platform?: string; tags?: string[] };
    const ctx = { uid: req.uid!, personaId };
    const dup = await opCheckDuplicate(ctx, b.text ?? '', { platform: b.platform, tags: b.tags });
    res.json({ ...dup, lint: lintPost(b.text ?? '', { platform: b.platform }) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '失敗しました' });
  }
});

// ---- 投稿計画（アプリ画面用・ログインユーザー） ----
agentRouter.get('/plan', requireAuth, async (req: AuthedRequest, res) => {
  const personaId = await resolveActivePersonaId(req.uid!);
  res.json({ personaId, slots: await getPostingPlan(req.uid!, personaId) });
});
agentRouter.put('/plan', requireAuth, async (req: AuthedRequest, res) => {
  const personaId = await resolveActivePersonaId(req.uid!);
  try {
    await assertPersonaAccess(personaId, req.uid!, 'editor');
    const slots = await savePostingPlan(req.uid!, personaId, ((req.body as { slots?: PlanSlot[] }).slots ?? []));
    res.json({ personaId, slots });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '保存に失敗しました' });
  }
});
agentRouter.get('/plan-gaps', requireAgentKey, rest((c, r) => opPlanGaps(c, { weeks: Number(r.query.weeks) || 2 })));
agentRouter.post('/performance', requireAgentKey, rest((c, r) => opPerformance(c, r.body as Parameters<typeof opPerformance>[1])));
