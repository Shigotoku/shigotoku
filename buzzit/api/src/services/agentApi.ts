/**
 * AI エージェント（MCP サーバー等）向け API。
 * - 認証: Firestore に保存した API キー（SHA-256 ハッシュ）。キーは uid と配信キャラに紐づく。
 * - 安全設計: 書き込みは「ネタ追加」と「下書き作成」だけ。承認・予約確定・投稿はできない。
 */
import { createHash, randomBytes } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { createScheduledJob, getScheduledJobs } from './firestore';
import { addIdeaInbox, listIdeaInbox, writeAuditLog } from './productExtras';
import { assertPersonaAccess, resolveActivePersonaId } from './personas';
import type { ScheduledJobStatus } from '../types/schedule';

export interface AgentRequest extends Request {
  agent?: { uid: string; personaId: string; keyId: string };
}

const KEY_PREFIX = 'bzk_';
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export async function requireAgentKey(req: AgentRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token.startsWith(KEY_PREFIX)) {
    res.status(401).json({ error: 'APIキーが必要です' });
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
    req.agent = { uid, personaId: String(doc.data().personaId), keyId: doc.id };
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

// ---- キー管理（アプリにログインした本人が操作） ----
agentRouter.post('/keys', requireAuth, async (req: AuthedRequest, res) => {
  const { label, personaId } = req.body as { label?: string; personaId?: string };
  try {
    const pid = personaId ?? (await resolveActivePersonaId(req.uid!));
    await assertPersonaAccess(pid, req.uid!, 'editor');
    const key = KEY_PREFIX + randomBytes(24).toString('hex');
    const ref = await getFirestore()
      .collection('users')
      .doc(req.uid!)
      .collection('apiKeys')
      .add({
        hash: sha256(key),
        label: (label ?? 'AI連携').slice(0, 60),
        personaId: pid,
        revoked: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    await writeAuditLog(req.uid!, 'agent_key.create', `${label ?? 'AI連携'} persona=${pid}`);
    res.json({
      id: ref.id,
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
      return { id: d.id, label: x.label, personaId: x.personaId, revoked: !!x.revoked };
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

/** 過去の投稿・予約・ネタとの類似チェック（重複ネタ防止） */
export async function opCheckDuplicate(ctx: AgentCtx, text: string) {
  if (!text?.trim()) throw new Error('text が必要です');
  const [jobs, ideas] = await Promise.all([
    getScheduledJobs(ctx.uid, undefined, ctx.personaId),
    listIdeaInbox(ctx.uid),
  ]);
  const candidates = [
    ...jobs.map((j) => ({
      kind: 'scheduled' as const,
      id: j.id,
      status: j.status as string,
      text: j.contents.map((c) => c.content).join('\n'),
    })),
    ...ideas.map((i) => ({ kind: 'idea' as const, id: i.id, status: i.status as string, text: i.text })),
  ];
  const matches = candidates
    .map((c) => ({ ...c, score: Math.round(similarity(text, c.text) * 100) / 100 }))
    .filter((c) => c.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => ({ ...c, text: c.text.slice(0, 200) }));
  return { duplicate: matches.some((m) => m.score >= 0.5), matches };
}

/** 下書き作成のみ。status は必ず draft で、ワーカーは draft を投稿しない。 */
export async function opCreateDraft(
  ctx: AgentCtx,
  input: {
    contents?: Array<{ platform?: string; label?: string; content?: string }>;
    scheduledAt?: string;
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
  const items = contents.slice(0, 5).map((c) => ({
    platform: String(c.platform ?? 'x_thread').slice(0, 30),
    label: String(c.label ?? '投稿').slice(0, 60),
    content: String(c.content ?? '').slice(0, 5000),
  }));
  if (items.some((i) => !i.content.trim())) throw new Error('content が空の項目があります');
  const jobId = await createScheduledJob(ctx.uid, {
    contents: items,
    scheduledAt: when.toISOString(),
    publishMode: 'notify',
    status: 'draft',
    personaId: ctx.personaId,
  });
  await writeAuditLog(ctx.uid, 'agent.draft.create', `${items.length}件`, { jobId });
  return {
    success: true,
    jobId,
    status: 'draft',
    message: '下書きとして保存しました。バジットのカレンダーで確認・承認・予約してください。',
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
agentRouter.post('/check-duplicate', requireAgentKey, rest((c, r) => opCheckDuplicate(c, (r.body as { text?: string }).text ?? '')));
agentRouter.post('/drafts', requireAgentKey, rest((c, r) => opCreateDraft(c, r.body as Parameters<typeof opCreateDraft>[1])));
