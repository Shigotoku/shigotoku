/**
 * SNSごとの運用ルール（自由記載）。
 * 例:「月曜は医療制度ネタ」「診療報酬の断定的な表現はしない」。
 * 人が画面で書くほか、使っているAI（MCP）も読み書きできる。AIはネタを作る前に必ず読む。
 */
import { Router } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { writeAuditLog } from './productExtras';

const db = () => getFirestore();
const col = (uid: string) => db().collection(`users/${uid}/snsRules`);

export const SNS_RULE_IDS = ['x', 'instagram', 'tiktok', 'facebook-threads', 'youtube-shorts', 'line', 'gbp'] as const;
export type SnsRuleId = (typeof SNS_RULE_IDS)[number];
export const SNS_RULE_LABEL: Record<SnsRuleId, string> = {
  x: 'X', instagram: 'Instagram', tiktok: 'TikTok', 'facebook-threads': 'Facebook / Threads',
  'youtube-shorts': 'YouTube Shorts', line: 'LINE公式', gbp: 'Googleビジネス',
};
const MAX = 8000;

/** 投稿候補の媒体ID(x_thread 等)・表記ゆれ・管理画面のID を、ルールのIDにそろえる */
export function toRuleId(raw: string): SnsRuleId | null {
  const s = (raw ?? '').normalize('NFKC').toLowerCase().trim();
  if ((SNS_RULE_IDS as readonly string[]).includes(s)) return s as SnsRuleId;
  if (['x_thread', 'x_free', 'twitter', 'x'].includes(s)) return 'x';
  if (['facebook', 'threads'].includes(s)) return 'facebook-threads';
  if (s === 'youtube_shorts' || s === 'youtube') return 'youtube-shorts';
  return null;
}

export interface SnsRule { platform: SnsRuleId; label: string; text: string; updatedAt?: string; updatedBy?: 'user' | 'ai' }

export async function getSnsRules(uid: string): Promise<SnsRule[]> {
  const snap = await col(uid).get();
  const by = new Map(snap.docs.map((d) => [d.id, d.data()]));
  return SNS_RULE_IDS.map((id) => {
    const d = by.get(id);
    return {
      platform: id, label: SNS_RULE_LABEL[id], text: String(d?.text ?? ''),
      updatedAt: d?.updatedAt?.toDate?.().toISOString(), updatedBy: d?.updatedBy,
    };
  });
}

export async function getSnsRule(uid: string, platform: string): Promise<SnsRule> {
  const id = toRuleId(platform);
  if (!id) throw new Error(`媒体は ${SNS_RULE_IDS.join(' / ')} のいずれかです`);
  return (await getSnsRules(uid)).find((r) => r.platform === id)!;
}

/** mode=replace は全文置き換え、append は末尾に追記（AIが既存ルールを消さないための既定） */
export async function setSnsRule(uid: string, platform: string, text: string, by: 'user' | 'ai', mode: 'replace' | 'append' = 'replace'): Promise<SnsRule> {
  const id = toRuleId(platform);
  if (!id) throw new Error(`媒体は ${SNS_RULE_IDS.join(' / ')} のいずれかです`);
  const incoming = String(text ?? '').trim();
  let next = incoming;
  const ref = col(uid).doc(id);
  if (mode === 'append') {
    const cur = String((await ref.get()).data()?.text ?? '').trim();
    next = cur ? `${cur}\n${incoming}` : incoming;
  }
  if (next.length > MAX) throw new Error(`ルールが長すぎます(最大${MAX}文字)`);
  await ref.set({ text: next, updatedAt: FieldValue.serverTimestamp(), updatedBy: by }, { merge: true });
  await writeAuditLog(uid, by === 'ai' ? 'snsrules.update.ai' : 'snsrules.update', `${id}(${mode})`);
  return getSnsRule(uid, id);
}

export const snsRulesRouter = Router();
snsRulesRouter.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try { res.json({ rules: await getSnsRules(req.uid!) }); } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : '失敗しました' }); }
});
snsRulesRouter.put('/:platform', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const b = req.body as { text?: string };
    res.json({ rule: await setSnsRule(req.uid!, String(req.params.platform), b.text ?? '', 'user') });
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : '失敗しました' }); }
});
