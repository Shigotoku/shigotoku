import { getFirestore, FieldValue } from 'firebase-admin/firestore';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
  stepId: string;
  stepOrder: number;
  stepTitle: string;
  instruction: string;
  note: string;
  screenshotUrl?: string;
  type?: string;
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
        stepId: s.id,
        stepOrder: Number(st.order ?? 0),
        stepTitle: String(st.title ?? ''),
        instruction: String(st.instruction ?? ''),
        note: String(st.note ?? ''),
        screenshotUrl: st.screenshotUrl as string | undefined,
        type: st.type as string | undefined,
      });
    }
  }
  return rows;
}

function collectMatches(rows: StepRow[], query: string, caseSensitive = false): BulkMatch[] {
  const q = caseSensitive ? query : query.toLowerCase();
  if (!q.trim()) return [];
  const matches: BulkMatch[] = [];

  const test = (text: string) => (caseSensitive ? text.includes(query) : text.toLowerCase().includes(q));

  for (const row of rows) {
    const fields: Array<{ field: BulkField; text: string; stepId?: string; stepOrder?: number; stepTitle?: string }> = [
      { field: 'manualTitle', text: row.manualTitle },
      { field: 'manualDescription', text: row.manualDescription },
      { field: 'title', text: row.stepTitle, stepId: row.stepId, stepOrder: row.stepOrder, stepTitle: row.stepTitle },
      { field: 'instruction', text: row.instruction, stepId: row.stepId, stepOrder: row.stepOrder, stepTitle: row.stepTitle },
      { field: 'note', text: row.note, stepId: row.stepId, stepOrder: row.stepOrder, stepTitle: row.stepTitle },
    ];
    for (const f of fields) {
      if (!f.text || !test(f.text)) continue;
      matches.push({
        manualId: row.manualId,
        manualTitle: row.manualTitle,
        stepId: f.stepId,
        stepOrder: f.stepOrder,
        stepTitle: f.stepTitle,
        field: f.field,
        before: f.text,
        linePreview: f.text.slice(0, 120),
      });
    }
  }
  return matches;
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
  return matches.map((m) => {
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
      risk: (after === m.before ? 'low' : m.field === 'note' && /個人情報|氏名|患者/.test(m.before) ? 'high' : 'low') as 'low' | 'medium' | 'high',
      requiresScreenshotUpdate: screenshotHint && Boolean(m.stepId),
      reason: after === m.before ? '変更なし' : undefined,
    };
  }).filter((c) => c.before !== c.after);
}

async function callGeminiBulk(
  instruction: string,
  matches: BulkMatch[],
  glossary: string[],
  rulebook: string,
): Promise<BulkChangeProposal[]> {
  const items = matches.map((m) => ({
    manualTitle: m.manualTitle,
    stepTitle: m.stepTitle ?? '',
    field: m.field,
    before: m.before,
  }));
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY が未設定です');

  const prompt = `あなたは業務マニュアルの一括更新アシスタントです。
ユーザーの指示に従い、各テキストを自然な日本語に修正してください。
過去の履歴説明として意図的に残すべき箇所は変更しないでください。
医療・個人情報・法務に関わる箇所は risk を high にしてください。
スクショに旧画面名が含まれる可能性がある場合は requiresScreenshotUpdate を true にしてください。

用語辞書（正しい表記）: ${glossary.slice(0, 30).join('、')}

社内ルールブック:
${rulebook.slice(0, 1500) || '（未設定）'}

ユーザー指示:
${instruction}

対象一覧（JSON）:
${JSON.stringify(items.slice(0, 40), null, 0)}

次のJSON配列のみを返してください（説明不要）:
[{"index":0,"after":"修正後テキスト","risk":"low|medium|high","requiresScreenshotUpdate":false,"reason":"短い理由"}]`;

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  const parsed = JSON.parse(raw) as Array<{
    index: number;
    after: string;
    risk: 'low' | 'medium' | 'high';
    requiresScreenshotUpdate?: boolean;
    reason?: string;
  }>;

  return matches.map((m, i) => {
    const g = parsed.find((p) => p.index === i) ?? parsed[i];
    return {
      manualId: m.manualId,
      manualTitle: m.manualTitle,
      stepId: m.stepId,
      stepOrder: m.stepOrder,
      stepTitle: m.stepTitle,
      field: m.field,
      before: m.before,
      after: g?.after ?? m.before,
      risk: g?.risk ?? 'medium',
      requiresScreenshotUpdate: Boolean(g?.requiresScreenshotUpdate),
      reason: g?.reason,
    };
  });
}

export async function scanBulkUpdate(orgId: string, uid: string, keyword: string): Promise<BulkMatch[]> {
  await assertOrgMember(orgId, uid);
  const rows = await loadOrgSteps(orgId);
  return collectMatches(rows, keyword);
}

export async function proposeBulkUpdate(input: {
  organizationId: string;
  uid: string;
  instruction: string;
  keyword?: string;
  replaceFrom?: string;
  replaceTo?: string;
  useAi?: boolean;
}): Promise<{ proposals: BulkChangeProposal[]; matchCount: number }> {
  await assertOrgMember(input.organizationId, input.uid);
  const rows = await loadOrgSteps(input.organizationId);
  const org = await getFirestore().collection('clipit_organizations').doc(input.organizationId).get();
  const orgData = org.data() ?? {};
  const glossary = (orgData.termGlossary as string[] | undefined) ?? [];
  const rulebook = String(orgData.rulebook ?? '');

  let matches: BulkMatch[];
  if (input.keyword?.trim()) {
    matches = collectMatches(rows, input.keyword.trim());
  } else if (input.replaceFrom?.trim()) {
    matches = collectMatches(rows, input.replaceFrom.trim());
  } else {
    matches = rows.flatMap((row) => [
      {
        manualId: row.manualId,
        manualTitle: row.manualTitle,
        stepId: row.stepId,
        stepOrder: row.stepOrder,
        stepTitle: row.stepTitle,
        field: 'instruction' as BulkField,
        before: row.instruction,
        linePreview: row.instruction.slice(0, 120),
      },
    ]).filter((m) => m.before.length > 0);
  }

  if (!input.useAi && input.replaceFrom && input.replaceTo !== undefined) {
    return { proposals: proposeSimpleReplace(matches, input.replaceFrom, input.replaceTo), matchCount: matches.length };
  }

  if (!input.useAi) {
    return { proposals: [], matchCount: matches.length };
  }

  const proposals = await callGeminiBulk(input.instruction, matches.slice(0, 40), glossary, rulebook);
  return { proposals: proposals.filter((p) => p.before !== p.after), matchCount: matches.length };
}

export async function applyBulkUpdate(input: {
  organizationId: string;
  uid: string;
  instruction: string;
  changes: BulkChangeProposal[];
}): Promise<{ batchId: string; appliedCount: number; skippedCount: number; manualIds: string[] }> {
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

  return { batchId: batchRef.id, appliedCount: applied.length, skippedCount: skipped, manualIds };
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
