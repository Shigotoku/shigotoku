import { geminiGenerateJson, type GeminiModel } from './geminiClient.js';

export type BulkSearchMode = 'keyword_replace' | 'contextual_rewrite' | 'manual_tone_unify';

export interface BulkSearchPlan {
  mode: BulkSearchMode;
  keywords: string[];
  regexPatterns: string[];
  replaceFrom?: string;
  replaceTo?: string;
  semanticQuery: string;
  summaryPreview: string;
}

export interface OrgContext {
  glossary: string[];
  rulebook: string;
  orgVariables: Record<string, string>;
}

const orgContextCache = new Map<string, { ctx: OrgContext; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedOrgContext(orgId: string, loader: () => Promise<OrgContext>): Promise<OrgContext> {
  const hit = orgContextCache.get(orgId);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) return Promise.resolve(hit.ctx);
  return loader().then((ctx) => {
    orgContextCache.set(orgId, { ctx, cachedAt: Date.now() });
    return ctx;
  });
}

export async function inferSearchPlan(instruction: string, ctx: OrgContext): Promise<BulkSearchPlan> {
  const varLines = Object.entries(ctx.orgVariables)
    .slice(0, 20)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const prompt = `あなたは業務マニュアル一括更新の検索プランナーです。
ユーザーの自然文指示から、Firestore内テキストを横断検索するための計画をJSONで返してください。

用語辞書: ${ctx.glossary.slice(0, 30).join('、') || '（なし）'}
社内ルール（抜粋）: ${ctx.rulebook.slice(0, 800) || '（なし）'}
組織変数:
${varLines || '（なし）'}

ユーザー指示:
${instruction}

次のJSONのみ返してください:
{
  "mode": "keyword_replace|contextual_rewrite|manual_tone_unify",
  "keywords": ["検索語1","検索語2"],
  "regexPatterns": [],
  "replaceFrom": "置換元（あれば）",
  "replaceTo": "置換先（あれば）",
  "semanticQuery": "意味検索用の短い要約文",
  "summaryPreview": "ユーザー向け1文サマリ（例: 3マニュアル・12箇所の表現を正式提供向けに直します）"
}

ルール:
- keywords は3〜8個。同義語・旧表記・略称も含める
- 単純な名称変更なら keyword_replace
- 文体統一・やさしい日本語など全体調整なら manual_tone_unify
- それ以外は contextual_rewrite
- replaceFrom/replaceTo は明確な置換指示があるときだけ`;

  try {
    const plan = await geminiGenerateJson<BulkSearchPlan>(prompt, 'flash');
    return {
      mode: plan.mode ?? 'contextual_rewrite',
      keywords: (plan.keywords ?? []).filter(Boolean).slice(0, 10),
      regexPatterns: (plan.regexPatterns ?? []).filter(Boolean).slice(0, 5),
      replaceFrom: plan.replaceFrom?.trim() || undefined,
      replaceTo: plan.replaceTo,
      semanticQuery: plan.semanticQuery?.trim() || instruction.slice(0, 200),
      summaryPreview: plan.summaryPreview?.trim() || '該当箇所を検索して変更案を作成します',
    };
  } catch {
    return {
      mode: 'contextual_rewrite',
      keywords: instruction.split(/\s+/).filter((w) => w.length >= 2).slice(0, 6),
      regexPatterns: [],
      semanticQuery: instruction.slice(0, 200),
      summaryPreview: '指示に基づき該当箇所を検索します',
    };
  }
}

export interface BulkProposalItem {
  index: number;
  after: string;
  risk: 'low' | 'medium' | 'high';
  requiresScreenshotUpdate?: boolean;
  reason?: string;
}

export async function proposeBulkChangesWithModel(
  instruction: string,
  items: Array<{ manualTitle: string; stepTitle: string; field: string; before: string }>,
  ctx: OrgContext,
  model: GeminiModel,
): Promise<BulkProposalItem[]> {
  if (!items.length) return [];

  const prompt = `あなたは業務マニュアルの一括更新アシスタントです。
ユーザーの指示に従い、各テキストを自然な日本語に修正してください。
過去の履歴説明として意図的に残すべき箇所は変更しないでください。
医療・個人情報・法務に関わる箇所は risk を high にしてください。
スクショに旧画面名が含まれる可能性がある場合は requiresScreenshotUpdate を true にしてください。

用語辞書: ${ctx.glossary.slice(0, 30).join('、')}
社内ルール:
${ctx.rulebook.slice(0, 1500) || '（未設定）'}

ユーザー指示:
${instruction}

対象一覧:
${JSON.stringify(items, null, 0)}

次のJSON配列のみ返してください:
[{"index":0,"after":"修正後","risk":"low|medium|high","requiresScreenshotUpdate":false,"reason":"短い理由"}]`;

  const parsed = await geminiGenerateJson<BulkProposalItem[]>(prompt, model);
  return Array.isArray(parsed) ? parsed : [];
}

export interface ManualToneBlock {
  manualId: string;
  manualTitle: string;
  fields: Array<{
    stepId?: string;
    stepOrder?: number;
    stepTitle?: string;
    field: string;
    before: string;
  }>;
}

export async function proposeManualToneUnify(
  instruction: string,
  blocks: ManualToneBlock[],
  ctx: OrgContext,
): Promise<Array<{ manualId: string; changes: Array<{ stepId?: string; field: string; before: string; after: string; risk: 'low' | 'medium' | 'high'; reason?: string }> }>> {
  const results: Array<{
    manualId: string;
    changes: Array<{ stepId?: string; field: string; before: string; after: string; risk: 'low' | 'medium' | 'high'; reason?: string }>;
  }> = [];

  for (const block of blocks.slice(0, 8)) {
    const docText = block.fields
      .map((f, i) => `[${i}] ${f.field}${f.stepTitle ? ` / ${f.stepTitle}` : ''}: ${f.before}`)
      .join('\n');

    const prompt = `マニュアル「${block.manualTitle}」の全文に対し、次の指示を適用してください。
各 [index] のテキストだけを修正し、意味は保ちつつ文体・表現を統一してください。

用語辞書: ${ctx.glossary.slice(0, 20).join('、')}
指示: ${instruction}

原文:
${docText.slice(0, 12000)}

JSON配列のみ:
[{"index":0,"after":"修正後","risk":"low|medium|high","reason":"理由"}]`;

    try {
      const parsed = await geminiGenerateJson<Array<{ index: number; after: string; risk: 'low' | 'medium' | 'high'; reason?: string }>>(
        prompt,
        'flash',
      );
      const changes = (parsed ?? [])
        .map((p) => {
          const src = block.fields[p.index];
          if (!src || !p.after || p.after === src.before) return null;
          return {
            stepId: src.stepId,
            field: src.field,
            before: src.before,
            after: p.after,
            risk: p.risk ?? 'medium',
            reason: p.reason,
          };
        })
        .filter(Boolean) as Array<{ stepId?: string; field: string; before: string; after: string; risk: 'low' | 'medium' | 'high'; reason?: string }>;

      if (changes.length) results.push({ manualId: block.manualId, changes });
    } catch {
      /* skip manual */
    }
  }

  return results;
}

export function buildApplySummary(
  instruction: string,
  proposals: Array<{ manualTitle: string; field: string; before: string; after: string }>,
  matchCount: number,
  plan?: BulkSearchPlan,
): string {
  const manualSet = new Set(proposals.map((p) => p.manualTitle));
  const manualCount = manualSet.size;
  const changeCount = proposals.length;

  if (!changeCount) {
    return plan?.summaryPreview ?? `「${instruction.slice(0, 40)}」に該当する変更候補は見つかりませんでした（検索 ${matchCount} 件）。`;
  }

  const samples = proposals.slice(0, 2).map((p) => {
    const from = p.before.slice(0, 24).replace(/\n/g, ' ');
    const to = p.after.slice(0, 24).replace(/\n/g, ' ');
    return `「${from}…」→「${to}…」`;
  });

  return `${manualCount} マニュアル・${changeCount} 箇所を更新します（検索 ${matchCount} 件）。${samples.join('、')} など。${plan?.summaryPreview ? ` ${plan.summaryPreview}` : ''}`;
}
