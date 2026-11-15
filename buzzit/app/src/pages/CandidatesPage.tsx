import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authFetch } from '../lib/api';
import SnsRulesBox, { RULE_ID_OF } from './SnsRulesBox';

type Selection = 'unreviewed' | 'adopted' | 'needs_fix' | 'hold' | 'rejected';
interface Candidate {
  id: string;
  managementId: string;
  series: string;
  title: string;
  body: string;
  imageIdea: string;
  rating: string;
  selection: Selection;
  checkNotes: string;
  editNotes: string;
  theme: string;
  conclusion: string;
  punchline: string;
  extra: Record<string, string>;
  status: 'candidate' | 'drafted' | 'scheduled' | 'published';
  platform: string;
  source: string;
  scheduledAt?: string;
  linkedJobId?: string;
  aiSuggestion?: string;
}
interface Match {
  source: string;
  id: string;
  managementId?: string;
  title?: string;
  text: string;
  stateLabel: string;
  kindLabels: string[];
  reasons: string[];
  score: number;
}
interface Dup { matches: Match[]; searched: number; engine: 'rule' | 'rule+ai'; aiNote?: string; note: string }
interface ListRes {
  candidates: Candidate[];
  total: number;
  counts: Record<string, number>;
  statusCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  series: string[];
  prefs: { useAi: boolean };
  ai: { mode: 'platform' | 'own'; provider: string; hasKey: boolean; usage: { used: number; limit: number } | null };
}
interface ImportRes {
  dryRun: boolean;
  summary: { rows: number; new: number; updated: number; skippedExisting: number; errors: number };
  columns: Array<{ column: string; mappedTo: string; label: string }>;
  autoIdCount: number;
  preview: Array<{ managementId: string; title: string; result: 'new' | 'skip' | 'update' }>;
  errors: Array<{ row: number; message: string }>;
  note: string;
}

const SEL: Record<Selection, { label: string; cls: string }> = {
  unreviewed: { label: '未選定', cls: 'bg-neutral-100 text-neutral-600' },
  adopted: { label: '採用', cls: 'bg-emerald-100 text-emerald-700' },
  needs_fix: { label: '要修正', cls: 'bg-amber-100 text-amber-700' },
  hold: { label: '保留', cls: 'bg-sky-100 text-sky-700' },
  rejected: { label: '不採用', cls: 'bg-rose-100 text-rose-700' },
};

const PLATFORMS: Array<[string, string]> = [['x_thread', 'X'], ['instagram', 'Instagram'], ['threads', 'Threads'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube_shorts', 'YouTube Shorts'], ['line', 'LINE'], ['gbp', 'Googleビジネス']];
const PLATFORM_NAME: Record<string, string> = Object.fromEntries(PLATFORMS);
const STATUS: Record<string, { label: string; cls: string }> = {
  candidate: { label: '候補', cls: 'bg-neutral-100 text-neutral-600' },
  drafted: { label: '下書き', cls: 'bg-violet-100 text-violet-700' },
  scheduled: { label: '予約済み', cls: 'bg-blue-100 text-blue-700' },
  published: { label: '投稿済み', cls: 'bg-emerald-100 text-emerald-700' },
};
const SOURCE_LABEL: Record<string, string> = { manual: '自分で書いた', idea: 'ネタ帳', xseries: 'ネタ一括作成', draft: 'AI下書き', import: '取り込み', ai: 'AI提案' };

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await authFetch(`/v1/candidates${path}`, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? `エラー(${res.status})`);
  return j as T;
}

function Badge({ s }: { s: Selection }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEL[s].cls}`}>{SEL[s].label}</span>;
}

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'skip' | 'update'>('skip');
  const [res, setRes] = useState<ImportRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setMsg('');
    try {
      const r = await call<ImportRes>('/import', { method: 'POST', body: { csv: text, mode, dryRun } });
      setRes(r);
      if (!dryRun) {
        setMsg(`取り込みました(新規${r.summary.new}件・更新${r.summary.updated}件・既存スキップ${r.summary.skippedExisting}件)。下書き・予約・公開は作られていません。`);
        setText('');
        setRes(null);
        onDone();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="text-sm font-semibold">スプレッドシート/CSVから取り込む</div>
      <p className="text-xs text-neutral-500">
        スプレッドシートの表をそのまま貼り付けるか、CSVファイルを選びます。列名は自由です(管理ID・シリーズ・タイトル・投稿本文・画像案・評価・選定状況・確認事項・編集メモ・テーマ・結論・オチは自動で対応し、それ以外の列は「追加項目」として保存します)。
        取り込んでも下書き・予約・公開は作られません。同じ管理IDは重複登録されません。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="text-xs" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
        <label className="text-xs">
          同じ管理IDがあるとき:
          <select className="ml-1 rounded border p-1" value={mode} onChange={(e) => setMode(e.target.value as 'skip' | 'update')}>
            <option value="skip">そのまま(スキップ)</option>
            <option value="update">内容を更新(選定状況は保持)</option>
          </select>
        </label>
      </div>
      <textarea className="h-32 w-full rounded-lg border p-2 text-xs" placeholder="ここに表を貼り付け(1行目が見出し)" value={text} onChange={(e) => { setText(e.target.value); setRes(null); }} />
      <div className="flex gap-2">
        <button disabled={busy || !text.trim()} onClick={() => run(true)} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">プレビュー</button>
        <button disabled={busy || !res || (res.summary.new + res.summary.updated === 0)} onClick={() => run(false)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">この内容で取り込む</button>
      </div>
      {msg && <p className="text-xs text-neutral-700">{msg}</p>}
      {res && (
        <div className="space-y-2 text-xs">
          <div className="font-semibold">新規 {res.summary.new}件 / 更新 {res.summary.updated}件 / 既存スキップ {res.summary.skippedExisting}件 / 問題 {res.summary.errors}件(全{res.summary.rows}行)</div>
          <div className="flex flex-wrap gap-1">
            {res.columns.map((c) => <span key={c.column} className="rounded bg-neutral-100 px-1.5 py-0.5">{c.column} → {c.label}</span>)}
          </div>
          {res.autoIdCount > 0 && <div className="text-amber-700">管理IDのない行が{res.autoIdCount}件あります。本文から自動でIDを付けます(同じ本文なら再取り込みしても重複しません)。</div>}
          {res.errors.map((er, i) => <div key={i} className="text-rose-700">{er.row}行目: {er.message}</div>)}
          <div className="text-neutral-500">{res.note}</div>
        </div>
      )}
    </div>
  );
}

function DupList({ dup }: { dup: Dup }) {
  if (!dup.matches.length) return <p className="text-sm text-emerald-700">似た投稿は見つかりませんでした(検索対象 {dup.searched}件)。</p>;
  return (
    <div className="space-y-2">
      {dup.matches.map((m) => (
        <div key={`${m.source}:${m.id}`} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs">{m.managementId ?? m.id}</span>
            <span className="text-xs text-neutral-500">{m.stateLabel}</span>
            {m.kindLabels.map((k) => <span key={k} className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{k}</span>)}
          </div>
          {m.title && <div className="mt-1 font-semibold">{m.title}</div>}
          <div className="mt-1 whitespace-pre-wrap text-xs text-neutral-700">{m.text}</div>
          <ul className="mt-1 list-disc pl-5 text-xs text-neutral-500">{m.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

function Detail({ id, list, reload }: { id: string; list: ListRes; reload: () => void }) {
  const [c, setC] = useState<Candidate | null>(null);
  const [dup, setDup] = useState<Dup | null>(null);
  const [body, setBody] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [when, setWhen] = useState('');
  const [platform, setPlatform] = useState('x_thread');
  const [asSchedule, setAsSchedule] = useState(true);

  const load = useCallback(async () => {
    setMsg('');
    const r = await call<{ candidate: Candidate; duplicates: Dup }>(`/${encodeURIComponent(id)}`);
    setC(r.candidate);
    setPlatform(r.candidate.platform || 'x_thread');
    setBody(r.candidate.body);
    setNote(r.candidate.editNotes);
    setDup(r.duplicates);
  }, [id]);
  useEffect(() => { load().catch((e) => setMsg(e.message)); }, [load]);

  const patch = async (p: Record<string, string>, after?: () => Promise<void>) => {
    setBusy(true);
    try {
      await call(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: p });
      await load();
      reload();
      await after?.();
    } catch (e) { setMsg(e instanceof Error ? e.message : '失敗しました'); } finally { setBusy(false); }
  };
  const check = async (ai: boolean) => {
    setBusy(true);
    try { setDup(await call<Dup>(`/${encodeURIComponent(id)}/check`, { method: 'POST', body: { ai } })); }
    catch (e) { setMsg(e instanceof Error ? e.message : '失敗しました'); } finally { setBusy(false); }
  };
  const toJob = async () => {
    setBusy(true);
    setMsg('');
    try {
      const r = await call<{ message: string }>(`/${encodeURIComponent(id)}/schedule`, { method: 'POST', body: { scheduledAt: new Date(when).toISOString(), platform, mode: asSchedule ? 'schedule' : 'draft' } });
      setMsg(r.message);
      await load();
      reload();
    } catch (e) { setMsg(e instanceof Error ? e.message : '失敗しました'); } finally { setBusy(false); }
  };

  if (!c) return <p className="p-4 text-sm text-neutral-500">{msg || '読み込み中…'}</p>;
  const dirty = body !== c.body || note !== c.editNotes;
  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm">{c.managementId}</span>
          <Badge s={c.selection} />
          {c.series && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{c.series}</span>}
          {c.rating && <span className="text-xs text-neutral-500">評価: {c.rating}</span>}
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[c.status]?.cls ?? ''}`}>{STATUS[c.status]?.label}</span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{PLATFORM_NAME[c.platform] ?? '媒体未設定'}</span>
          {c.source && SOURCE_LABEL[c.source] && <span className="text-[11px] text-neutral-400">{SOURCE_LABEL[c.source]}</span>}
        </div>
        <h2 className="mt-1 text-lg font-bold">{c.title || '(タイトルなし)'}</h2>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold text-neutral-500">投稿本文</div>
        <textarea className="h-40 w-full rounded-lg border p-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="mb-1 mt-2 text-xs font-semibold text-neutral-500">編集メモ</div>
        <textarea className="h-16 w-full rounded-lg border p-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
        <button disabled={!dirty || busy} onClick={() => patch({ body, editNotes: note })} className="mt-2 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">本文・メモを保存</button>
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-2">
        {c.imageIdea && <div><div className="text-xs font-semibold text-neutral-500">画像案</div><div className="whitespace-pre-wrap">{c.imageIdea}</div></div>}
        {c.checkNotes && <div><div className="text-xs font-semibold text-neutral-500">確認事項</div><div className="whitespace-pre-wrap">{c.checkNotes}</div></div>}
        {c.theme && <div><div className="text-xs font-semibold text-neutral-500">テーマ</div>{c.theme}</div>}
        {c.conclusion && <div><div className="text-xs font-semibold text-neutral-500">結論</div>{c.conclusion}</div>}
        {c.punchline && <div><div className="text-xs font-semibold text-neutral-500">オチ</div>{c.punchline}</div>}
        {Object.entries(c.extra).map(([k, v]) => <div key={k}><div className="text-xs font-semibold text-neutral-500">{k}</div><div className="whitespace-pre-wrap">{v}</div></div>)}
      </div>

      {c.aiSuggestion && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm">
          <div className="text-xs font-semibold text-violet-700">AIからの改善提案(採否は人が決めます)</div>
          <div className="mt-1 whitespace-pre-wrap">{c.aiSuggestion}</div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-semibold text-neutral-500">判断する</div>
        <div className="flex flex-wrap gap-2">
          {(['adopted', 'needs_fix', 'hold', 'rejected'] as Selection[]).map((s) => (
            <button key={s} disabled={busy || c.selection === s} onClick={() => patch({ selection: s })} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-40 ${c.selection === s ? SEL[s].cls : ''}`}>{SEL[s].label}</button>
          ))}
          {c.selection !== 'unreviewed' && <button disabled={busy} onClick={() => patch({ selection: 'unreviewed' })} className="rounded-lg border px-3 py-1.5 text-sm text-neutral-500">未選定に戻す</button>}
        </div>
      </div>

      {c.status === 'candidate' && c.selection !== 'rejected' && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-sm font-semibold">投稿予定を立てる</div>
          <p className="text-xs text-neutral-600">日時と投稿先を決めて「予約」すると、時間になったら自動で投稿されます(Xなど連携済みの媒体)。連携していない媒体は、時間になると通知でお知らせします。予約すると「採用」になり、投稿予定はダッシュボード・カレンダーに出ます。</p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="datetime-local" className="rounded border p-1 text-sm" value={when} onChange={(e) => setWhen(e.target.value)} />
            <select className="rounded border p-1 text-sm" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <label className="text-xs"><input type="checkbox" checked={!asSchedule} onChange={(e) => setAsSchedule(!e.target.checked)} /> 予約せず下書きにする</label>
            <button disabled={busy || !when} onClick={toJob} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">{asSchedule ? '予約する' : '下書きにする'}</button>
          </div>
        </div>
      )}
      {c.status !== 'candidate' && (
        <p className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
          {STATUS[c.status]?.label}{c.scheduledAt ? `(${new Date(c.scheduledAt).toLocaleString('ja-JP')})` : ''}。投稿の確認・変更は <Link to="/calendar" className="underline">週表示・編集</Link> で行えます。
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-neutral-500">投稿先の媒体</span>
        <select className="rounded border p-1" value={c.platform} disabled={busy} onChange={(e) => patch({ platform: e.target.value })}>
          <option value="">未設定</option>
          {PLATFORMS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </div>      {msg && <p className="text-sm text-neutral-700">{msg}</p>}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-neutral-500">過去の類似投稿(候補・Xシリーズ在庫・下書き・予約・投稿済み・ネタ帳が対象)</div>
          <button disabled={busy} onClick={() => check(false)} className="rounded border px-2 py-1 text-xs">ルールで再確認</button>
          <button disabled={busy} onClick={() => check(true)} className="rounded border px-2 py-1 text-xs">AIでも判定する</button>
        </div>
        <p className="text-[11px] text-neutral-500">
          AI判定には{list.ai.mode === 'own' ? `あなたのAIキー(${list.ai.provider})` : `運営AI${list.ai.usage ? `(今月 ${list.ai.usage.used}/${list.ai.usage.limit}回)` : ''}`}を使います。切り替えは <Link to="/settings" className="underline">設定 &gt; キャラ・AI</Link> で選べます。
        </p>
        {dup?.aiNote && <p className="text-xs text-violet-700">{dup.aiNote}</p>}
        {dup ? <DupList dup={dup} /> : <p className="text-sm text-neutral-500">確認中…</p>}
        {dup && <p className="text-[11px] text-neutral-400">{dup.note}</p>}
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const [data, setData] = useState<ListRes | null>(null);
  const [params, setParams] = useSearchParams();
  const platformSel = params.get('platform') ?? '';
  const setPlatformSel = (v: string) => setParams(v ? { platform: v } : {}, { replace: true });
  const [stSel, setStSel] = useState('');
  const [quick, setQuick] = useState('');
  const [quickPlatform, setQuickPlatform] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [bulkPlatform, setBulkPlatform] = useState('');
  const [sel, setSel] = useState('');
  const [series, setSeries] = useState('');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [err, setErr] = useState('');

  const reload = useCallback(async () => {
    const p = new URLSearchParams();
    if (sel) p.set('selection', sel);
    if (stSel) p.set('status', stSel);
    if (platformSel) p.set('platform', platformSel);
    if (series) p.set('series', series);
    if (q.trim()) p.set('q', q.trim());
    try { setData(await call<ListRes>(`?${p}`)); setErr(''); } catch (e) { setErr(e instanceof Error ? e.message : '読み込めませんでした'); }
  }, [sel, stSel, platformSel, series, q]);

  // 開くたびに、ネタ帳・ネタ一括作成・AI下書きを候補へそろえる(何度でも安全・重複しない)
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    call<{ created: number }>('/sync', { method: 'POST' })
      .then((r) => { if (r.created > 0) setSyncMsg(`ネタ帳・ネタ一括作成・AI下書きから ${r.created}件 を候補に追加しました。`); return reload(); })
      .catch(() => undefined);
  }, [reload]);

  const bulkSet = async () => {
    try {
      const r = await call<{ updated: number }>('/set-platform', { method: 'POST', body: { platform: bulkPlatform } });
      setSyncMsg(`媒体未設定の候補 ${r.updated}件 を ${PLATFORM_NAME[bulkPlatform]} にしました。`);
      setBulkPlatform('');
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : '設定できませんでした'); }
  };

  const addQuick = async () => {
    try {
      const r = await call<{ candidate: Candidate }>('/', { method: 'POST', body: { body: quick, platform: quickPlatform || platformSel } });
      setQuick('');
      await reload();
      setOpenId(r.candidate.id);
    } catch (e) { setErr(e instanceof Error ? e.message : '追加できませんでした'); }
  };
  useEffect(() => { const t = setTimeout(() => void reload(), 200); return () => clearTimeout(t); }, [reload]);

  const exportCsv = async () => {
    const res = await authFetch('/v1/candidates/export-csv');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'buzzit-post-candidates.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const togglePref = async () => {
    if (!data) return;
    const r = await call<{ useAi: boolean }>('/prefs', { method: 'PUT', body: { useAi: !data.prefs.useAi } });
    setData({ ...data, prefs: r });
  };

  const chips = useMemo(() => (data ? [['', `すべて ${data.counts.all ?? 0}`], ...(Object.keys(SEL) as Selection[]).map((k) => [k, `${SEL[k].label} ${data.counts[k] ?? 0}`])] : []), [data]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">投稿ネタの置き場です。自分で書いたネタ・ネタ帳・ネタ一括作成・AI下書きが全部ここに集まります。重複チェック → 日時を決めて予約 → 時間になったら投稿、までをここで進められます。予約の確定は人が押します。</p>
      {err && <p className="text-sm text-rose-700">{err}</p>}
      {syncMsg && <p className="text-sm text-emerald-700">{syncMsg}</p>}
      <div className="flex flex-wrap items-start gap-2 rounded-2xl border bg-white p-3">
        <textarea className="h-16 min-w-[16rem] flex-1 rounded-lg border p-2 text-sm" placeholder="思いついたネタをここに書いて追加(あとで媒体・日時を決められます)" value={quick} onChange={(e) => setQuick(e.target.value)} />
        <select className="rounded border p-1 text-sm" value={quickPlatform || platformSel} onChange={(e) => setQuickPlatform(e.target.value)}>
          <option value="">媒体は後で</option>
          {PLATFORMS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
        <button disabled={!quick.trim()} onClick={addQuick} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">候補に追加</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowImport(!showImport)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white">{showImport ? '取り込みを閉じる' : '取り込む'}</button>
        <button onClick={exportCsv} className="rounded-lg border px-3 py-1.5 text-sm">CSVで書き出す(バックアップ)</button>
        <span className="rounded-full bg-neutral-900 px-3 py-1 text-sm font-semibold text-white">
          {platformSel === '' ? 'すべてのSNS' : platformSel === 'none' ? '媒体未設定' : `${PLATFORM_NAME[platformSel] ?? platformSel}の投稿候補`}
        </span>
        {data && ([['', 'すべて'], ...PLATFORMS.map(([k, n]) => [k, `${n} ${data.platformCounts[k] ?? 0}`]), ...(data.platformCounts.none ? [['none', `未設定 ${data.platformCounts.none}`]] : [])] as string[][]).map(([k, label]) => (
          <button key={k} onClick={() => setPlatformSel(k)} className={`rounded-full border px-3 py-1 text-xs ${platformSel === k ? 'border-neutral-900 bg-neutral-900 text-white' : 'bg-white'}`}>{label}</button>
        ))}
      </div>
      {data && (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={data.prefs.useAi} onChange={togglePref} />
          重複チェックにAIも使う(既定はルールのみ・無料)
        </label>
      )}
      {platformSel !== '' && platformSel !== 'none' && RULE_ID_OF[platformSel] && <SnsRulesBox ruleId={RULE_ID_OF[platformSel]} />}
      {data && (data.platformCounts.none ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
          <span>媒体が決まっていない候補が {data.platformCounts.none}件 あります。</span>
          <select className="rounded border p-1" value={bulkPlatform} onChange={(e) => setBulkPlatform(e.target.value)}>
            <option value="">媒体を選ぶ</option>
            {PLATFORMS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <button disabled={!bulkPlatform} onClick={bulkSet} className="rounded-lg bg-neutral-900 px-3 py-1 text-white disabled:opacity-40">未設定をまとめてその媒体にする</button>
          <span className="text-neutral-500">(すでに媒体のある候補は変わりません。個別の変更は詳細画面で)</span>
        </div>
      )}      {showImport && <ImportPanel onDone={reload} />}

      {data && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500">進み具合</span>
          {([['', 'すべて'], ...Object.entries(STATUS).map(([k, v]) => [k, `${v.label} ${data.statusCounts[k] ?? 0}`])] as string[][]).map(([k, label]) => (
            <button key={k} onClick={() => setStSel(k)} className={`rounded-full border px-3 py-1 text-xs ${stSel === k ? 'bg-neutral-900 text-white' : ''}`}>{label}</button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {chips.map(([k, label]) => (
          <button key={k} onClick={() => setSel(k)} className={`rounded-full border px-3 py-1 text-xs ${sel === k ? 'bg-neutral-900 text-white' : ''}`}>{label}</button>
        ))}
        {data && data.series.length > 0 && (
          <select className="rounded border p-1 text-xs" value={series} onChange={(e) => setSeries(e.target.value)}>
            <option value="">全シリーズ</option>
            {data.series.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <input className="rounded border p-1 text-xs" placeholder="管理ID・本文で検索" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl border bg-white p-2">
          {data?.candidates.map((c) => (
            <button key={c.id} onClick={() => setOpenId(c.id)} className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-50 ${openId === c.id ? 'bg-neutral-100' : ''}`}>
              <div className="flex items-center gap-2"><span className="font-mono text-xs text-neutral-500">{c.managementId}</span><Badge s={c.selection} />{c.status !== 'candidate' && <span className={`rounded-full px-1.5 text-[11px] ${STATUS[c.status]?.cls}`}>{STATUS[c.status]?.label}</span>}<span className="text-[11px] text-neutral-500">{PLATFORM_NAME[c.platform] ?? '媒体未設定'}</span></div>
              <div className="truncate font-semibold">{c.title || c.body.slice(0, 40)}</div>
              {c.series && <div className="text-[11px] text-neutral-500">{c.series}</div>}
            </button>
          ))}
          {data && data.candidates.length === 0 && <p className="p-4 text-sm text-neutral-500">候補がありません。「取り込む」から追加してください。</p>}
        </div>
        <div className="rounded-2xl border bg-white p-4">
          {openId && data ? <Detail key={openId} id={openId} list={data} reload={reload} /> : <p className="text-sm text-neutral-500">左の一覧から候補を選ぶと、本文・画像案・類似投稿をここで確認できます。</p>}
        </div>
      </div>
    </div>
  );
}
