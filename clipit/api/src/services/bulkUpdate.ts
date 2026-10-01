import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  buildApplySummary,
  getCachedOrgContext,
  inferSearchPlan,
  proposeBulkChangesWithModel,
  proposeManualToneUnify,
  type BulkSearchPlan,
  type OrgContext,
} from './bulkUpdateAi.js';
import { embedText } from './geminiClient.js';
import { ensureStepEmbeddings, filterRowsBySemanticSimilarity } from './stepSearchIndex.js';

export type BulkField = 'title' | 'instruction' | 'note' | 'manualTitle' | 'manualDescription';

export interface BulkMatch {
  manualId: string;
  manualTitle: string;
  stepId?: string;
  stepOrder?: number;
  stepTitle?: string;
  field: BulkField;
  before: string;
  linePreview: string;
  matchSource?: 'keyword' | 'semantic' | 'manual';
}

export interface BulkChangeProposal {
  manualId: string;
  manualTitle: string;
  stepId?: string;
  stepOrder?: number;
  stepTitle?: string;
  field: BulkField;
  before: string;
  after: string;
  risk: 'low' | 'medium' | 'high';
  requiresScreenshotUpdate: boolean;
  reason?: string;
  excluded?: boolean;
}

export interface BulkBatchRecord {
  id: string;
  organizationId: string;
  instruction: string;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  status: 'applied' | 'rolled_back';
  appliedCount: number;
  skippedCount: number;
  changes: Array<{
    manualId: string;
    stepId?: string;
    field: BulkField;
    before: string;
    after: string;
  }>;
}

interface StepRow {
  manualId: string;
  manualTitle: string;
  manualDescription: string;
  folderId?: string | null;
  stepId: string;
  stepOrder: number;
  stepTitle: string;
  instruction: string;
  note: string;
  screenshotUrl?: string;
  type?: string;
  searchEmbedding?: number[];
}

export interface BulkUpdateScope {
  mode?: 'all' | 'selected';
  folderIds?: string[];
  manualIds?: string[];
  includeUncategorized?: boolean;
}

export interface BulkProposeResult {
  proposals: BulkChangeProposal[];
  matchCount: number;
  summary: string;
  searchPlan?: BulkSearchPlan;
  inferredKeywords?: string[];
  phase?: 'analyze' | 'complete';
}

function matchKey(m: Pick<BulkMatch, 'manualId' | 'stepId' | 'field' | 'before'>) {
  return `${m.manualId}:${m.stepId ?? 'manual'}:${m.field}:${m.before.slice(0, 80)}`;
}

function filterRowsByScope(rows: StepRow[], scope?: BulkUpdateScope): StepRow[] {
  if (!scope || scope.mode !== 'selected') return rows;
  const folderSet = new Set(scope.folderIds ?? []);
  const manualSet = new Set(scope.manualIds ?? []);
  const includeNone = scope.includeUncategorized !== false;

  return rows.filter((row) => {
    if (manualSet.has(row.manualId)) return true;
    if (!row.folderId && includeNone) return true;
    if (row.folderId && folderSet.has(row.folderId)) return true;
    return false;
  });
}

async function assertOrgMember(orgId: string, uid: string) {
  const member = await getFirestore()
    .collection('clipit_organizations')
    .doc(orgId)
    .collection('members')
    .doc(uid)
    .get();
  if (!member.exists) {
    const err = new Error('組織へのアクセスがありません') as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

async function loadOrgContext(orgId: string): Promise<OrgContext> {
  const org = await getFirestore().collection('clipit_organizations').doc(orgId).get();
  const data = org.data() ?? {};
  return {
    glossary: (data.termGlossary as string[] | undefined) ?? [],
    rulebook: String(data.rulebook ?? ''),
    orgVariables: (data.orgVariables as Record<string, string> | undefined) ?? {},
  };
}

export async function loadOrgSteps(orgId: string): Promise<StepRow[]> {
  const db = getFirestore();
  const manualsSnap = await db
    .collection('clipit_manuals')
    .where('organizationId', '==', orgId)
    .get();
  const rows: StepRow[] = [];
  for (const m of manualsSnap.docs) {
    const data = m.data();
    const stepsSnap = await db.collection('clipit_manuals').doc(m.id).collection('steps').orderBy('order').get();
    for (const s of stepsSnap.docs) {
      const st = s.data();
      rows.push({
        manualId: m.id,
        manualTitle: String(data.title ?? ''),
        manualDescription: String(data.description ?? ''),
        folderId: (data.folderId as string | null | undefined) ?? null,
        stepId: s.id,
        stepOrder: Number(st.order ?? 0),
        stepTitle: String(st.title ?? ''),
        instruction: String(st.instruction ?? ''),
        note: String(st.note ?? ''),
        screenshotUrl: st.screenshotUrl as string | undefined,
        type: st.type as string | undefined,
        searchEmbedding: st.searchEmbedding as number[] | undefined,
      });
    }
  }
  return rows;
}

function collectMatchesFromQuery(rows: StepRow[], query: string, source: BulkMatch['matchSource'] = 'keyword'): BulkMatch[] {
  const q = query.toLowerCase();
  if (!q.trim()) return [];
  const matches: BulkMatch[] = [];

  for (const row of rows) {
    const fields: Array<{ field: BulkField; text: string; stepId?: string; stepOrder?: number; stepTitle?: string }> = [
      { field: 'manualTitle', text: row.manualTitle },
      { field: 'manualDescription', text: row.manualDescription },
      { field: 'title', text: row.stepTitle, stepId: row.stepId, stepOrder: row.stepOrder, stepTitle: row.stepTitle },
      { field: 'instruction', text: row.instruction, stepId: row.stepId, stepOrder: row.stepOrder, stepTitle: row.stepTitle },
      { field: 'note', text: row.note, stepId: row.stepId, stepOrder: row.stepOrder, stepTitle: row.stepTitle },
    ];
    for (const f of fields) {
      if (!f.text || !f.text.toLowerCase().includes(q)) continue;
      matches.push({
        manualId: row.manualId,
        manualTitle: row.manualTitle,
        stepId: f.stepId,
        stepOrder: f.stepOrder,
        stepTitle: f.stepTitle,
        field: f.field,
        before: f.text,
        linePreview: f.text.slice(0, 120),
        matchSource: source,
      });
    }
  }
  return matches;
}

function collectMatchesMulti(rows: StepRow[], plan: BulkSearchPlan): BulkMatch[] {
  const seen = new Set<string>();
  const out: BulkMatch[] = [];

  const push = (m: BulkMatch) => {
    const key = matchKey(m);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(m);
  };

  for (const kw of plan.keywords) {
    for (const m of collectMatchesFromQuery(rows, kw, 'keyword')) push(m);
  }

  for (const pattern of plan.regexPatterns) {
    try {
      const re = new RegExp(pattern, 'i');
      for (const row of rows) {
        const fields: Array<{ field: BulkField; text: string; stepId?: string; stepOrder?: number; stepTitle?: string }> = [
          { field: 'manualTitle', text: row.manualTitle },
          { field: 'manualDescription', text: row.manualDescription },
          { field: 'title', text: row.stepTitle, stepId: row.stepId, stepOrder: row.stepOrder, stepTitle: row.stepTitle },
          { field: 'instruction', text: row.instruction, stepId: row.stepId, stepOrder: row.stepOrder, stepTitle: row.stepTitle },
          { field: 'note', text: row.note, stepId: row.stepId, stepOrder: row.stepOrder, stepTitle: row.stepTitle },
        ];
        for (const f of fields) {
          if (!f.text || !re.test(f.text)) continue;
          push({
            manualId: row.manualId,
            manualTitle: row.manualTitle,
            stepId: f.stepId,
            stepOrder: f.stepOrder,
            stepTitle: f.stepTitle,
            field: f.field,
            before: f.text,
            linePreview: f.text.slice(0, 120),
            matchSource: 'keyword',
          });
        }
      }
    } catch {
      /* invalid regex */
    }
  }

  if (plan.replaceFrom?.trim()) {
    for (const m of collectMatchesFromQuery(rows, plan.replaceFrom.trim(), 'keyword')) push(m);
  }

  return out;
}

function matchesToRowsForSemantic(rows: StepRow[], matches: BulkMatch[]): StepRow[] {
  const stepKeys = new Set(matches.filter((m) => m.stepId).map((m) => `${m.manualId}:${m.stepId}`));
  if (!stepKeys.size) return rows.filter((r) => r.instruction.trim() || r.note.trim());
  return rows.filter((r) => stepKeys.has(`${r.manualId}:${r.stepId}`));
}

async function collectSemanticMatches(rows: StepRow[], semanticQuery: string): Promise<BulkMatch[]> {
  const queryEmbedding = await embedText(semanticQuery);
  if (!queryEmbedding.length) return [];

  const embeddingByStep = await ensureStepEmbeddings(rows);
  const similarRows = filterRowsBySemanticSimilarity(rows, embeddingByStep, queryEmbedding, 0.68);

  const matches: BulkMatch[] = [];
  for (const row of similarRows) {
    for (const f of [
      { field: 'instruction' as BulkField, text: row.instruction },
      { field: 'note' as BulkField, text: row.note },
      { field: 'title' as BulkField, text: row.stepTitle },
    ]) {
      if (!f.text.trim()) continue;
      matches.push({
        manualId: row.manualId,
        manualTitle: row.manualTitle,
        stepId: row.stepId,
        stepOrder: row.stepOrder,
        stepTitle: row.stepTitle,
        field: f.field,
        before: f.text,
        linePreview: f.text.slice(0, 120),
        matchSource: 'semantic',
      });
    }
  }
  return matches;
}

function mergeMatches(...lists: BulkMatch[][]): BulkMatch[] {
  const seen = new Set<string>();
  const out: BulkMatch[] = [];
  for (const list of lists) {
    for (const m of list) {
      const key = matchKey(m);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
  }
  return out;
}

export function proposeSimpleReplace(
  matches: BulkMatch[],
  from: string,
  to: string,
  caseSensitive = false,
): BulkChangeProposal[] {
  const replaceIn = (text: string) => {
    if (caseSensitive) return text.split(from).join(to);
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return text.replace(re, to);
  };
  return matches
    .map((m) => {
      const after = replaceIn(m.before);
      const screenshotHint = /freee|マネーフォワード|旧|ログイン画面|URL/i.test(from + m.before);
      return {
        manualId: m.manualId,
        manualTitle: m.manualTitle,
        stepId: m.stepId,
        stepOrder: m.stepOrder,
        stepTitle: m.stepTitle,
        field: m.field,
        before: m.before,
        after,
        risk: (after === m.before
          ? 'low'
          : m.field === 'note' && /個人情報|氏名|患者/.test(m.before)
            ? 'high'
            : 'low') as 'low' | 'medium' | 'high',
        requiresScreenshotUpdate: screenshotHint && Boolean(m.stepId),
        reason: after === m.before ? '変更なし' : undefined,
      };
    })
    .filter((c) => c.before !== c.after);
}

function matchToProposal(m: BulkMatch, g: { after: string; risk: 'low' | 'medium' | 'high'; requiresScreenshotUpdate?: boolean; reason?: string }): BulkChangeProposal {
  return {
    manualId: m.manualId,
    manualTitle: m.manualTitle,
    stepId: m.stepId,
    stepOrder: m.stepOrder,
    stepTitle: m.stepTitle,
    field: m.field,
    before: m.before,
    after: g.after,
    risk: g.risk,
    requiresScreenshotUpdate: Boolean(g.requiresScreenshotUpdate),
    reason: g.reason,
  };
}

async function proposeWithAiRouting(
  instruction: string,
  matches: BulkMatch[],
  ctx: OrgContext,
  plan: BulkSearchPlan,
): Promise<BulkChangeProposal[]> {
  const capped = matches.slice(0, 80);
  if (!capped.length) return [];

  if (plan.mode === 'manual_tone_unify') {
    const byManual = new Map<string, BulkMatch[]>();
    for (const m of capped) {
      const list = byManual.get(m.manualId) ?? [];
      list.push(m);
      byManual.set(m.manualId, list);
    }

    const blocks = [...byManual.entries()].map(([manualId, ms]) => ({
      manualId,
      manualTitle: ms[0]!.manualTitle,
      fields: ms.map((m) => ({
        stepId: m.stepId,
        stepOrder: m.stepOrder,
        stepTitle: m.stepTitle,
        field: m.field,
        before: m.before,
      })),
    }));

    const unified = await proposeManualToneUnify(instruction, blocks, ctx);
    const proposals: BulkChangeProposal[] = [];
    for (const u of unified) {
      for (const c of u.changes) {
        const src = capped.find((m) => m.manualId === u.manualId && m.stepId === c.stepId && m.field === c.field && m.before === c.before);
        if (!src) continue;
        proposals.push({
          manualId: u.manualId,
          manualTitle: src.manualTitle,
          stepId: c.stepId,
          stepOrder: src.stepOrder,
          stepTitle: src.stepTitle,
          field: c.field as BulkField,
          before: c.before,
          after: c.after,
          risk: c.risk,
          requiresScreenshotUpdate: /旧|画面|URL|ログイン/i.test(c.before + instruction),
          reason: c.reason,
        });
      }
    }
    return proposals.filter((p) => p.before !== p.after);
  }

  const items = capped.map((m) => ({
    manualTitle: m.manualTitle,
    stepTitle: m.stepTitle ?? '',
    field: m.field,
    before: m.before,
  }));

  const flashItems = items.slice(0, 40);
  const flashMatches = capped.slice(0, 40);
  const flashResults = await proposeBulkChangesWithModel(instruction, flashItems, ctx, 'flash');

  const proposals: BulkChangeProposal[] = flashMatches.map((m, i) => {
    const g = flashResults.find((p) => p.index === i) ?? flashResults[i];
    return matchToProposal(m, {
      after: g?.after ?? m.before,
      risk: g?.risk ?? 'medium',
      requiresScreenshotUpdate: g?.requiresScreenshotUpdate,
      reason: g?.reason,
    });
  });

  const highRiskIndexes = proposals
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.risk === 'high' || p.risk === 'medium')
    .slice(0, 15);

  if (highRiskIndexes.length) {
    const proItems = highRiskIndexes.map(({ i }) => items[i]!);
    const proResults = await proposeBulkChangesWithModel(instruction, proItems, ctx, 'pro');
    for (let j = 0; j < highRiskIndexes.length; j++) {
      const { i } = highRiskIndexes[j]!;
      const g = proResults.find((p) => p.index === j) ?? proResults[j];
      if (!g?.after) continue;
      proposals[i] = matchToProposal(flashMatches[i]!, {
        after: g.after,
        risk: g.risk ?? 'high',
        requiresScreenshotUpdate: g.requiresScreenshotUpdate,
        reason: g.reason ?? 'Proモデルで再確認',
      });
    }
  }

  return proposals.filter((p) => p.before !== p.after);
}

export async function scanBulkUpdate(
  orgId: string,
  uid: string,
  keyword: string,
  scope?: BulkUpdateScope,
): Promise<BulkMatch[]> {
  await assertOrgMember(orgId, uid);
  const rows = filterRowsByScope(await loadOrgSteps(orgId), scope);
  return collectMatchesFromQuery(rows, keyword);
}

export async function analyzeBulkUpdate(input: {
  organizationId: string;
  uid: string;
  instruction: string;
  scope?: BulkUpdateScope;
}): Promise<{ searchPlan: BulkSearchPlan; matchCount: number; inferredKeywords: string[]; summary: string }> {
  await assertOrgMember(input.organizationId, input.uid);
  const ctx = await getCachedOrgContext(input.organizationId, () => loadOrgContext(input.organizationId));
  const rows = filterRowsByScope(await loadOrgSteps(input.organizationId), input.scope);
  const searchPlan = await inferSearchPlan(input.instruction, ctx);
  const keywordMatches = collectMatchesMulti(rows, searchPlan);
  const semanticMatches = await collectSemanticMatches(matchesToRowsForSemantic(rows, keywordMatches), searchPlan.semanticQuery);
  const matches = mergeMatches(keywordMatches, semanticMatches);
  const summary = buildApplySummary(input.instruction, [], matches.length, searchPlan);
  return {
    searchPlan,
    matchCount: matches.length,
    inferredKeywords: searchPlan.keywords,
    summary,
  };
}

export async function proposeBulkUpdate(input: {
  organizationId: string;
  uid: string;
  instruction: string;
  keyword?: string;
  replaceFrom?: string;
  replaceTo?: string;
  useAi?: boolean;
  scope?: BulkUpdateScope;
  searchPlan?: BulkSearchPlan;
}): Promise<BulkProposeResult> {
  await assertOrgMember(input.organizationId, input.uid);
  const rows = filterRowsByScope(await loadOrgSteps(input.organizationId), input.scope);
  const ctx = await getCachedOrgContext(input.organizationId, () => loadOrgContext(input.organizationId));

  let searchPlan: BulkSearchPlan | undefined = input.searchPlan;
  let matches: BulkMatch[] = [];

  if (input.useAi) {
    searchPlan = searchPlan ?? (await inferSearchPlan(input.instruction, ctx));
    if (input.keyword?.trim()) searchPlan.keywords.unshift(input.keyword.trim());
    if (input.replaceFrom?.trim()) {
      searchPlan.replaceFrom = input.replaceFrom.trim();
      searchPlan.replaceTo = input.replaceTo ?? '';
    }
    matches = collectMatchesMulti(rows, searchPlan);
    const semanticMatches = await collectSemanticMatches(
      matchesToRowsForSemantic(rows, matches.length ? matches : []),
      searchPlan.semanticQuery,
    );
    matches = mergeMatches(matches, semanticMatches);

    if (!matches.length && searchPlan.mode === 'manual_tone_unify') {
      matches = rows.flatMap((row) => {
        if (!row.instruction.trim()) return [];
        return [{
          manualId: row.manualId,
          manualTitle: row.manualTitle,
          stepId: row.stepId,
          stepOrder: row.stepOrder,
          stepTitle: row.stepTitle,
          field: 'instruction' as BulkField,
          before: row.instruction,
          linePreview: row.instruction.slice(0, 120),
          matchSource: 'manual' as const,
        }];
      });
    }
  } else if (input.keyword?.trim()) {
    matches = collectMatchesFromQuery(rows, input.keyword.trim());
  } else if (input.replaceFrom?.trim()) {
    matches = collectMatchesFromQuery(rows, input.replaceFrom.trim());
  }

  if (!input.useAi && input.replaceFrom && input.replaceTo !== undefined) {
    const proposals = proposeSimpleReplace(matches, input.replaceFrom, input.replaceTo);
    return {
      proposals,
      matchCount: matches.length,
      summary: buildApplySummary(input.instruction, proposals, matches.length),
      inferredKeywords: input.keyword ? [input.keyword] : undefined,
    };
  }

  if (!input.useAi) {
    return {
      proposals: [],
      matchCount: matches.length,
      summary: buildApplySummary(input.instruction, [], matches.length),
    };
  }

  if (!searchPlan) {
    searchPlan = await inferSearchPlan(input.instruction, ctx);
  }

  const proposals = await proposeWithAiRouting(input.instruction, matches, ctx, searchPlan);
  const summary = buildApplySummary(input.instruction, proposals, matches.length, searchPlan);

  return {
    proposals,
    matchCount: matches.length,
    summary,
    searchPlan,
    inferredKeywords: searchPlan.keywords,
    phase: 'complete',
  };
}

export async function applyBulkUpdate(input: {
  organizationId: string;
  uid: string;
  instruction: string;
  changes: BulkChangeProposal[];
}): Promise<{ batchId: string; appliedCount: number; skippedCount: number; manualIds: string[]; summary: string }> {
  await assertOrgMember(input.organizationId, input.uid);
  const db = getFirestore();
  const toApply = input.changes.filter((c) => !c.excluded && c.before !== c.after);
  const batchRef = db.collection('clipit_bulk_batches').doc();
  const applied: BulkBatchRecord['changes'] = [];
  let skipped = 0;

  for (const c of toApply) {
    try {
      if (c.field === 'manualTitle' || c.field === 'manualDescription') {
        await db.collection('clipit_manuals').doc(c.manualId).update({
          [c.field === 'manualTitle' ? 'title' : 'description']: c.after,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (c.stepId) {
        const patch: Record<string, string> = {};
        if (c.field === 'title') patch.title = c.after;
        if (c.field === 'instruction') patch.instruction = c.after;
        if (c.field === 'note') patch.note = c.after;
        await db.collection('clipit_manuals').doc(c.manualId).collection('steps').doc(c.stepId).update({
          ...patch,
          searchEmbedding: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        await db.collection('clipit_manuals').doc(c.manualId).update({ updatedAt: FieldValue.serverTimestamp() });
      } else {
        skipped++;
        continue;
      }
      applied.push({
        manualId: c.manualId,
        stepId: c.stepId,
        field: c.field,
        before: c.before,
        after: c.after,
      });
    } catch {
      skipped++;
    }
  }

  await batchRef.set({
    organizationId: input.organizationId,
    instruction: input.instruction,
    createdBy: input.uid,
    createdAt: FieldValue.serverTimestamp(),
    status: 'applied',
    appliedCount: applied.length,
    skippedCount: skipped,
    changes: applied,
  });

  const manualIds = [...new Set(applied.map((c) => c.manualId))];
  const notice = `一括更新: ${input.instruction.slice(0, 80)}`;
  for (const manualId of manualIds) {
    const mref = db.collection('clipit_manuals').doc(manualId);
    const msnap = await mref.get();
    const cur = (msnap.data()?.confirmationVersion as number | undefined) ?? 1;
    await mref.update({
      confirmationVersion: cur + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const tokens = await db.collection('clipit_shareTokens').where('manualId', '==', manualId).limit(10).get();
    for (const t of tokens.docs) {
      await t.ref.update({ updateNotice: notice, refreshedAt: FieldValue.serverTimestamp() });
    }
  }

  await db.collection('clipit_notifications').add({
    organizationId: input.organizationId,
    type: 'bulk_update',
    batchId: batchRef.id,
    message: notice,
    manualIds,
    appliedCount: applied.length,
    createdBy: input.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  const summary = `${applied.length} 件を ${manualIds.length} マニュアルに適用しました`;

  return { batchId: batchRef.id, appliedCount: applied.length, skippedCount: skipped, manualIds, summary };
}

export async function listBulkBatches(orgId: string, uid: string): Promise<BulkBatchRecord[]> {
  await assertOrgMember(orgId, uid);
  const snap = await getFirestore()
    .collection('clipit_bulk_batches')
    .where('organizationId', '==', orgId)
    .limit(50)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as BulkBatchRecord)
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
    .slice(0, 30);
}

export async function rollbackBulkBatch(batchId: string, orgId: string, uid: string): Promise<{ restored: number }> {
  await assertOrgMember(orgId, uid);
  const db = getFirestore();
  const ref = db.collection('clipit_bulk_batches').doc(batchId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('履歴が見つかりません');
  const data = snap.data()!;
  if (data.organizationId !== orgId) throw new Error('アクセスが拒否されました');
  if (data.status === 'rolled_back') throw new Error('すでに元に戻しています');

  let restored = 0;
  for (const c of data.changes as BulkBatchRecord['changes']) {
    try {
      if (c.field === 'manualTitle' || c.field === 'manualDescription') {
        await db.collection('clipit_manuals').doc(c.manualId).update({
          [c.field === 'manualTitle' ? 'title' : 'description']: c.before,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (c.stepId) {
        const patch: Record<string, string> = {};
        if (c.field === 'title') patch.title = c.before;
        if (c.field === 'instruction') patch.instruction = c.before;
        if (c.field === 'note') patch.note = c.before;
        await db.collection('clipit_manuals').doc(c.manualId).collection('steps').doc(c.stepId).update({
          ...patch,
          searchEmbedding: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      restored++;
    } catch {
      /* skip */
    }
  }
  await ref.update({ status: 'rolled_back', rolledBackAt: FieldValue.serverTimestamp() });
  return { restored };
}

/** AI一括更新のクォータ消費見積もり */
export function estimateBulkAiCostUnits(matchCount: number, useAi: boolean): number {
  if (!useAi) return 0;
  return 1 + Math.ceil(matchCount / 40) + (matchCount > 0 ? 1 : 0);
}
