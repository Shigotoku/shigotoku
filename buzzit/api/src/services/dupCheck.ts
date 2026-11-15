/**
 * 投稿の重複・類似チェック（ルールベース。AI は任意で上乗せ）。
 * 種類: 完全一致 / 表現が似ている / テーマが近い / 結論が同じ / オチが同じ / 投稿済みのテーマ
 * 自動削除はしない。人が判断できるよう「どれと、なぜ似ているか」を理由つきで返す。
 */

export type DupKind = 'exact' | 'similar' | 'theme' | 'conclusion' | 'punchline' | 'published_theme';

export const DUP_KIND_LABEL: Record<DupKind, string> = {
  exact: '完全一致',
  similar: '表現が似ている',
  theme: 'テーマが近い',
  conclusion: '結論が同じ',
  punchline: 'オチが同じ',
  published_theme: '投稿済みのテーマ',
};

export type DupSource = 'candidate' | 'xseries' | 'scheduled' | 'idea';

export interface DupItem {
  source: DupSource;
  id: string;
  managementId?: string;
  title?: string;
  text: string;
  /** 状態の表示名（投稿済み・予約済み・候補 など） */
  stateLabel: string;
  /** 投稿済み（過去に公開した）か */
  published: boolean;
  series?: string;
  theme?: string;
  conclusion?: string;
  punchline?: string;
}

export interface DupTarget {
  /** 自分自身を除外するための ID（source:id の形） */
  selfKey?: string;
  text: string;
  title?: string;
  theme?: string;
  conclusion?: string;
  punchline?: string;
}

export interface DupMatch {
  source: DupSource;
  id: string;
  managementId?: string;
  title?: string;
  text: string;
  stateLabel: string;
  published: boolean;
  series?: string;
  kinds: DupKind[];
  kindLabels: string[];
  reasons: string[];
  score: number;
}

export const normalize = (s: string): string =>
  (s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000、。，．,.!！?？「」『』()（）\-ー・～~…:：;；"'’“”#＃@＠【】\[\]]/g, '');

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** 文字2-gram の Jaccard 類似度（0〜1）。引数は normalize 済み */
export function bigramSimilarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

const STOP = new Set(['こと', 'ため', 'これ', 'それ', 'ところ', 'よう', 'もの', 'さん', 'です', 'ます', 'する', 'した', 'いる', 'ある', 'など', 'そして', 'でも', 'から', 'まで', 'です', 'ので']);

/** 漢字・カタカナ・英数字の連なりを「主要語」として取り出す */
export function keywords(text: string): Set<string> {
  const t = (text ?? '').normalize('NFKC').toLowerCase();
  const found = t.match(/[\u4e00-\u9fff]{2,}|[\u30a1-\u30fc]{2,}|[a-z0-9]{3,}/g) ?? [];
  return new Set(found.filter((w) => !STOP.has(w)));
}

function keywordOverlap(a: Set<string>, b: Set<string>): { shared: string[]; jaccard: number } {
  const shared = [...a].filter((w) => b.has(w));
  const union = a.size + b.size - shared.length;
  return { shared, jaccard: union ? shared.length / union : 0 };
}

/** 4コマ・短い漫画風の投稿で「最後の一行」をオチとみなす（複数行ある場合のみ） */
export function lastPunchline(text: string): string {
  const lines = (text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return '';
  const last = lines[lines.length - 1];
  return normalize(last).length >= 6 ? last : '';
}

const clip = (s: string, n = 40) => (s.length > n ? s.slice(0, n) + '…' : s);

export const SIMILAR_THRESHOLD = 0.5;
export const LOOSE_THRESHOLD = 0.3;

export interface Scored {
  item: DupItem;
  kinds: DupKind[];
  reasons: string[];
  score: number;
  /** AI 判定の候補に回すための緩い関連度 */
  loose: number;
}

/** 1件の比較。何も該当しなければ kinds は空 */
export function compareOne(t: DupTarget, it: DupItem): Scored {
  const kinds: DupKind[] = [];
  const reasons: string[] = [];
  const nt = normalize(t.text);
  const ni = normalize(it.text);
  let score = 0;

  const bi = nt && ni ? bigramSimilarity(nt, ni) : 0;
  if (nt && ni && nt === ni) {
    kinds.push('exact');
    reasons.push('本文が（記号・空白を除いて）完全に一致しています。');
    score = 1;
  } else if (bi >= SIMILAR_THRESHOLD) {
    kinds.push('similar');
    reasons.push(`文字の重なりが約${Math.round(bi * 100)}%で、表現がよく似ています。`);
    score = Math.max(score, bi);
  }

  // テーマ: 明示のテーマ欄が近い、または主要語の重なりが大きい
  const tTheme = normalize(t.theme ?? '');
  const iTheme = normalize(it.theme ?? '');
  const kt = keywords(`${t.title ?? ''} ${t.theme ?? ''} ${t.text}`);
  const ki = keywords(`${it.title ?? ''} ${it.theme ?? ''} ${it.text}`);
  const ov = keywordOverlap(kt, ki);
  let themeHit = false;
  if (tTheme && iTheme && (tTheme === iTheme || bigramSimilarity(tTheme, iTheme) >= 0.7)) {
    themeHit = true;
    reasons.push(`テーマ欄が同じです（「${clip(t.theme ?? '')}」≒「${clip(it.theme ?? '')}」）。`);
    score = Math.max(score, 0.6);
  } else if (ov.shared.length >= 3 && ov.jaccard >= 0.35) {
    themeHit = true;
    reasons.push(`主要な語が共通しています（${ov.shared.slice(0, 6).join('、')}）。`);
    score = Math.max(score, Math.min(0.55, ov.jaccard));
  }
  if (themeHit && !kinds.includes('exact') && !kinds.includes('similar')) kinds.push('theme');

  // 結論: 明示の結論欄どうしを比較（欄がないと判断できないため AI 判定に委ねる）
  const tc = normalize(t.conclusion ?? '');
  const ic = normalize(it.conclusion ?? '');
  if (tc && ic && (tc === ic || bigramSimilarity(tc, ic) >= 0.6)) {
    kinds.push('conclusion');
    reasons.push(`結論が同じです（「${clip(t.conclusion ?? '')}」≒「${clip(it.conclusion ?? '')}」）。`);
    score = Math.max(score, 0.65);
  }

  // オチ: 明示のオチ欄、なければ本文の最後の一行（複数行のみ）
  const tp = t.punchline?.trim() || lastPunchline(t.text);
  const ip = it.punchline?.trim() || lastPunchline(it.text);
  if (tp && ip) {
    const a = normalize(tp);
    const b = normalize(ip);
    if (a === b || bigramSimilarity(a, b) >= 0.6) {
      kinds.push('punchline');
      reasons.push(`オチが同じです（「${clip(tp)}」≒「${clip(ip)}」）。`);
      score = Math.max(score, 0.6);
    }
  }

  // 過去に投稿済みで、何らかの重なりがあるもの
  if (it.published && kinds.length) {
    kinds.push('published_theme');
    reasons.push('過去に投稿済みの内容と重なっています。');
  }

  return { item: it, kinds, reasons, score: Math.round(score * 100) / 100, loose: Math.max(bi, ov.jaccard) };
}

export function toMatch(s: Scored, textLimit = 500): DupMatch {
  const it = s.item;
  return {
    source: it.source,
    id: it.id,
    managementId: it.managementId,
    title: it.title,
    text: it.text.slice(0, textLimit),
    stateLabel: it.stateLabel,
    published: it.published,
    series: it.series,
    kinds: s.kinds,
    kindLabels: s.kinds.map((k) => DUP_KIND_LABEL[k]),
    reasons: s.reasons,
    score: s.score,
  };
}

export function findDuplicates(t: DupTarget, items: DupItem[], limit = 10): { matches: DupMatch[]; pool: Scored[] } {
  const scored = items
    .filter((it) => `${it.source}:${it.id}` !== t.selfKey)
    .map((it) => compareOne(t, it));
  const hits = scored
    .filter((s) => s.kinds.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => toMatch(s));
  // AI 判定に渡す候補: ルールで当たらなかったが、関連が緩くある上位
  const pool = scored.filter((s) => s.loose >= 0.12 || s.kinds.length).sort((a, b) => b.loose - a.loose || b.score - a.score).slice(0, 8);
  return { matches: hits, pool };
}

// ---- AI 判定（任意）の入出力 ----

export function buildAiDupPrompt(t: DupTarget, pool: Scored[]): string {
  const list = pool
    .map((s, i) => `[${i + 1}] ID:${s.item.managementId ?? s.item.id} / 状態:${s.item.stateLabel}\n${(s.item.title ? `タイトル: ${s.item.title}\n` : '')}本文: ${s.item.text.slice(0, 400)}`)
    .join('\n\n');
  return `あなたはSNS運用の編集者です。新しい投稿案が、既存の投稿と「内容として重複していないか」を判定してください。言い回しが違っても、同じテーマ・同じ結論・同じオチなら重複とみなします。

# 新しい投稿案
${t.title ? `タイトル: ${t.title}\n` : ''}本文: ${t.text.slice(0, 600)}

# 既存の投稿
${list || '(なし)'}

# 出力(JSONのみ。説明文やコードブロックは不要)
[{"no":1,"sameTheme":true|false,"sameConclusion":true|false,"samePunchline":true|false,"reason":"30〜60字で理由"}]
既存投稿ごとに1要素。確信が持てないものは false にしてください。`;
}

export function parseAiVerdicts(text: string): Array<{ no: number; sameTheme: boolean; sameConclusion: boolean; samePunchline: boolean; reason: string }> {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]) as Array<Record<string, unknown>>;
    return arr
      .map((o) => ({
        no: Number(o.no),
        sameTheme: o.sameTheme === true,
        sameConclusion: o.sameConclusion === true,
        samePunchline: o.samePunchline === true,
        reason: String(o.reason ?? '').slice(0, 200),
      }))
      .filter((o) => Number.isInteger(o.no));
  } catch {
    return [];
  }
}

/** ルール結果に AI の判定を上乗せする（理由には「AI判定」と明記） */
export function mergeAiVerdicts(ruleMatches: DupMatch[], pool: Scored[], verdicts: ReturnType<typeof parseAiVerdicts>): DupMatch[] {
  const byKey = new Map<string, DupMatch>(ruleMatches.map((m) => [`${m.source}:${m.id}`, m]));
  for (const v of verdicts) {
    const s = pool[v.no - 1];
    if (!s) continue;
    const add: DupKind[] = [];
    if (v.sameTheme) add.push('theme');
    if (v.sameConclusion) add.push('conclusion');
    if (v.samePunchline) add.push('punchline');
    if (!add.length) continue;
    const key = `${s.item.source}:${s.item.id}`;
    const cur = byKey.get(key) ?? { ...toMatch({ ...s, kinds: [], reasons: [], score: 0 }), kinds: [], kindLabels: [], reasons: [], score: 0 };
    for (const k of add) if (!cur.kinds.includes(k)) cur.kinds.push(k);
    if (s.item.published && !cur.kinds.includes('published_theme')) cur.kinds.push('published_theme');
    cur.kindLabels = cur.kinds.map((k) => DUP_KIND_LABEL[k]);
    cur.reasons.push(`AI判定: ${v.reason || add.map((k) => DUP_KIND_LABEL[k]).join('・')}`);
    cur.score = Math.max(cur.score, 0.6);
    byKey.set(key, cur);
  }
  return [...byKey.values()].sort((a, b) => b.score - a.score).slice(0, 10);
}
