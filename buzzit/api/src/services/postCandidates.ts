/**
 * 投稿候補（BuzzIt を SNS 投稿管理の正本にするための入れ物）。
 * - 管理ID（MD-001 等）をキーに、スプレッドシート/CSV から一括取り込み（再取り込みしても重複しない）
 * - 取り込みは「候補」として保存するだけ。下書き・予約・公開は一切作らない（既存の投稿・予約・シリーズは触らない）
 * - 列名は自由（ChatGPT 等が決めた列でよい）。既知の列は自動対応、未知の列は「追加項目」として保持
 * - 重複チェックはルールベースが基本。ユーザーが選べば AI（運営AI / 自分のAIキー）でも判定
 */
import { createHash } from 'node:crypto';
import { Router } from 'express';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { aiFetch, aiKey, getAiSettings, withUserAi } from './aiClient';
import { AiQuotaError, consumeAiQuota, getAiUsage } from './planLimits';
import { getScheduledJobs, getUserSettings } from './firestore';
import { jobText, opCreateDraft, platformOf, type AgentCtx } from './agentApi';
import { parseCsv } from './agentExtras';
import { listIdeaInbox, writeAuditLog } from './productExtras';
import { assertPersonaAccess, resolveActivePersonaId } from './personas';
import {
  buildAiDupPrompt,
  findDuplicates,
  mergeAiVerdicts,
  normalize,
  parseAiVerdicts,
  type DupItem,
  type DupMatch,
  type DupTarget,
} from './dupCheck';

const db = () => getFirestore();
const col = (uid: string) => db().collection(`users/${uid}/postCandidates`);

export type Selection = 'unreviewed' | 'adopted' | 'needs_fix' | 'hold' | 'rejected';
export const SELECTION_LABEL: Record<Selection, string> = {
  unreviewed: '未選定',
  adopted: '採用',
  needs_fix: '要修正',
  hold: '保留',
  rejected: '不採用',
};
export type CandidateStatus = 'candidate' | 'drafted';

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
  checkNotes: string;
  editNotes: string;
  theme: string;
  conclusion: string;
  punchline: string;
  /** 取り込んだ元の列のうち、既知の項目に当てはまらなかったもの（列名は自由） */
  extra: Record<string, string>;
  status: CandidateStatus;
  linkedJobId?: string;
  aiSuggestion?: string;
  createdAt: string;
  updatedAt: string;
}

const TEXT_FIELDS = ['series', 'title', 'body', 'imageIdea', 'rating', 'checkNotes', 'editNotes', 'theme', 'conclusion', 'punchline'] as const;
type TextField = (typeof TEXT_FIELDS)[number];
type FieldKey = TextField | 'managementId' | 'selection';

export const FIELD_LABEL: Record<FieldKey, string> = {
  managementId: '管理ID',
  series: 'シリーズ',
  title: 'タイトル',
  body: '投稿本文',
  imageIdea: '画像案',
  rating: '評価',
  selection: '選定状況',
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
  checkNotes: ['確認事項', '確認', '要確認', '注意', 'チェック'],
  editNotes: ['編集メモ', 'メモ', '備考', 'notes', 'note', '修正メモ'],
  punchline: ['4コマのオチ', 'オチ', '落ち', 'punchline'],
  conclusion: ['結論', '要点', '主張', 'conclusion'],
  theme: ['テーマ', 'theme', 'トピック'],
};
const MATCH_ORDER: FieldKey[] = ['managementId', 'body', 'title', 'series', 'punchline', 'conclusion', 'theme', 'imageIdea', 'rating', 'selection', 'checkNotes', 'editNotes'];

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
      const idx = hs.findIndex((h, i) => out[i] === 'extra' && !override[headers[i]] && h && aliases.some((a) => (pass === 'exact' ? h === a : a.length >= (/^[a-z0-9]+$/.test(a) ? 4 : 2) && h.includes(a))));
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
    checkNotes: d.checkNotes ?? '',
    editNotes: d.editNotes ?? '',
    theme: d.theme ?? '',
    conclusion: d.conclusion ?? '',
    punchline: d.punchline ?? '',
    extra: (d.extra as Record<string, string>) ?? {},
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

  type Parsed = { managementId: string; auto: boolean; fields: Partial<Record<TextField, string>>; selectionRaw: string; extra: Record<string, string>; rowNo: number };
  const parsed: Parsed[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  const seen = new Set<string>();
  records.forEach((rec, i) => {
    const rowNo = i + 2;
    const fields: Partial<Record<TextField, string>> = {};
    const extra: Record<string, string> = {};
    let mid = '';
    let selectionRaw = '';
    headers.forEach((h, c) => {
      const v = clean(rec[c]);
      const m = mapping[c];
      if (!v || m === 'ignore') return;
      if (m === 'extra') extra[h.slice(0, 40)] = v.slice(0, 2000);
      else if (m === 'managementId') mid = v.slice(0, 60);
      else if (m === 'selection') selectionRaw = v.slice(0, 60);
      else fields[m] = v;
    });
    if (!fields.body && !fields.title) {
      if (Object.keys(extra).length || mid) errors.push({ row: rowNo, message: '本文もタイトルも空のためスキップしました' });
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
    parsed.push({ managementId: mid, auto, fields, selectionRaw, extra, rowNo });
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

    const base = { ...Object.fromEntries(Object.entries(p.fields)), extra: p.extra, managementId: p.managementId, updatedAt: FieldValue.serverTimestamp() };
    if (result === 'new') {
      const full: Record<string, unknown> = {};
      for (const f of TEXT_FIELDS) full[f] = p.fields[f] ?? '';
      batch.set(ref, {
        ...full,
        managementId: p.managementId,
        extra: p.extra,
        selection: toSelection(p.selectionRaw),
        selectionRaw: p.selectionRaw,
        status: 'candidate',
        source: 'import',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // 更新: シートに値がある項目だけ上書きする。人が付けた選定状況・状態・下書きとの紐づけは保持する
      batch.set(ref, base, { merge: true });
    }
    inBatch++;
    if (inBatch >= 400) await flush();
  }
  if (!input.dryRun) {
    await flush();
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

export async function listCandidates(uid: string, q: { query?: string; series?: string; selection?: string; status?: string; limit?: number } = {}) {
  const snap = await col(uid).limit(2000).get();
  let list = snap.docs.map((d) => fromDoc(d.id, d.data()));
  const counts: Record<string, number> = { all: list.length };
  for (const c of list) counts[c.selection] = (counts[c.selection] ?? 0) + 1;
  const series = [...new Set(list.map((c) => c.series).filter(Boolean))].sort();
  if (q.series) list = list.filter((c) => c.series === q.series);
  if (q.selection) list = list.filter((c) => c.selection === q.selection);
  if (q.status) list = list.filter((c) => c.status === q.status);
  if (q.query?.trim()) {
    const k = q.query.normalize('NFKC').toLowerCase();
    list = list.filter((c) => `${c.managementId} ${c.title} ${c.body} ${c.series} ${c.theme} ${Object.values(c.extra).join(' ')}`.normalize('NFKC').toLowerCase().includes(k));
  }
  list.sort((a, b) => a.managementId.localeCompare(b.managementId, 'ja', { numeric: true }));
  return { candidates: list.slice(0, q.limit ?? 500), total: list.length, counts, series };
}

export async function getCandidate(uid: string, id: string): Promise<Candidate> {
  const s = await col(uid).doc(id).get();
  if (!s.exists) throw new Error('投稿候補が見つかりません');
  return fromDoc(s.id, s.data()!);
}

export interface CandidatePatch extends Partial<Record<TextField, string>> {
  selection?: Selection;
  aiSuggestion?: string;
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
  if (typeof patch.aiSuggestion === 'string') {
    upd.aiSuggestion = clean(patch.aiSuggestion, 3000);
    upd.aiSuggestedAt = FieldValue.serverTimestamp();
  }
  await ref.update(upd);
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
  return importCandidates(uid, { rows: stripped, columnMap: opts.columnMap, mode: 'skip', dryRun: opts.dryRun });
}
const toSelectionHeader = (h: string) => mapHeaders([h])[0] === 'selection';

/** 採用済みの候補だけ、人が日時を決めて下書きにできる。日時は必須（自動で予約・公開はしない） */
export async function candidateToDraft(ctx: AgentCtx, id: string, input: { scheduledAt?: string; platform?: string }) {
  const c = await getCandidate(ctx.uid, id);
  if (c.selection !== 'adopted') throw new Error('「採用」にした候補だけ下書きにできます');
  if (c.status === 'drafted') throw new Error(`すでに下書きに移しています（${c.linkedJobId ?? ''}）。二重に作らないよう止めました`);
  if (!c.body.trim()) throw new Error('投稿本文が空です');
  const r = await opCreateDraft(ctx, {
    contents: [{ platform: input.platform || 'x_thread', label: c.title || c.managementId, content: c.body }],
    scheduledAt: input.scheduledAt,
    topic: c.title || undefined,
    silent: true,
  });
  await col(ctx.uid).doc(id).update({ status: 'drafted', linkedJobId: r.jobId, updatedAt: FieldValue.serverTimestamp() });
  await writeAuditLog(ctx.uid, 'candidates.to_draft', `${c.managementId} → ${r.jobId}`);
  return { ...r, candidateId: id };
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

/** 検索対象: 投稿候補・Xシリーズ在庫・下書き/予約/投稿済み・ネタ帳 のすべて */
export async function gatherDupPool(ctx: AgentCtx): Promise<DupItem[]> {
  const out: DupItem[] = [];
  const [cands, jobs, ideas] = await Promise.all([
    col(ctx.uid).limit(2000).get(),
    getScheduledJobs(ctx.uid, undefined, ctx.personaId, 1500),
    listIdeaInbox(ctx.uid).catch(() => []),
  ]);
  for (const d of cands.docs) {
    const c = fromDoc(d.id, d.data());
    out.push({
      source: 'candidate', id: c.id, managementId: c.managementId, title: c.title,
      text: c.body || c.title, stateLabel: `投稿候補(${SELECTION_LABEL[c.selection]}${c.status === 'drafted' ? '・下書き移行済み' : ''})`,
      published: false, series: c.series, theme: c.theme, conclusion: c.conclusion, punchline: c.punchline,
    });
  }
  for (const j of jobs) {
    out.push({
      source: 'scheduled', id: j.id, title: j.topic,
      text: jobText(j), stateLabel: `${JOB_STATE[j.status] ?? j.status}(${platformOf(j)})`,
      published: j.status === 'published' || j.status === 'notified',
    });
  }
  for (const i of ideas) {
    out.push({ source: 'idea', id: i.id, text: i.text, stateLabel: i.status === 'used' ? 'ネタ帳(使用済み)' : 'ネタ帳', published: false });
  }
  try {
    const series = await db().collection(`users/${ctx.uid}/xSeries`).limit(100).get();
    for (const s of series.docs) {
      const items = await s.ref.collection('items').limit(1000).get();
      for (const it of items.docs) {
        const x = it.data();
        out.push({
          source: 'xseries', id: it.id, title: x.title || undefined,
          text: String(x.text ?? ''),
          stateLabel: `Xシリーズ在庫「${String(s.data().name ?? '')}」(${x.status === 'published' ? '投稿済み' : x.approved ? '投稿OK' : '未承認'})`,
          published: x.status === 'published', series: String(s.data().name ?? ''),
        });
      }
    }
  } catch {
    // シリーズが無い・読めない場合は他の対象だけで続行
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
  const pool = await gatherDupPool(ctx);
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
  const { candidates } = await listCandidates(uid, { limit: 2000 });
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
    const ai = await getAiSettings(req.uid!);
    const st = await getUserSettings(req.uid!);
    res.json({
      ...(await listCandidates(req.uid!, { query: q.q, series: q.series, selection: q.selection, status: q.status })),
      prefs: await getDupPrefs(req.uid!),
      ai: { mode: ai.mode, provider: ai.provider, hasKey: ai.hasKey, usage: ai.mode === 'platform' ? await getAiUsage(req.uid!, st.plan) : null },
    });
  } catch (e) { fail(res, e); }
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
    const c = await getCandidate(req.uid!, String(req.params.id));
    const dup = await checkDuplicates(await ctxOf(req), targetOf(c), { ai: false });
    res.json({ candidate: c, duplicates: dup });
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

candidatesRouter.post('/:id/draft', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const b = req.body as { scheduledAt?: string; platform?: string };
    res.json(await candidateToDraft(await ctxOf(req, true), String(req.params.id), b));
  } catch (e) { fail(res, e); }
});
