import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, ImageOff, ImagePlus, Plus, Search, Upload, X } from 'lucide-react';
import { authFetch } from '../lib/api';
import SnsRulesBox, { RULE_ID_OF } from './SnsRulesBox';
import CandidatePreview, { PLATFORM_META, isVideoUrl } from './CandidatePreview';

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
  mediaUrls: string[];
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

const PLATFORMS: Array<[string, string]> = PLATFORM_META.map((p) => [p.id, p.name] as [string, string]);
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

/** 画像・動画をクラウドに保存して公開URLを得る */
async function uploadFile(file: File): Promise<string> {
  if (!/^(image|video)\//.test(file.type)) throw new Error('画像または動画のファイルを選んでください');
  const res = await authFetch('/v1/upload', {
    method: 'POST',
    headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name || 'pasted-image.png') },
    body: file,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? 'アップロードに失敗しました');
  return (j as { publicUrl: string }).publicUrl;
}

function Badge({ s }: { s: Selection }) {
  return <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${SEL[s].cls}`}>{SEL[s].label}</span>;
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
    <div className="shrink-0 space-y-2 rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold">スプレッドシート/CSVから取り込む</div>
      <p className="text-xs text-neutral-500">
        表をそのまま貼り付けるか、CSVファイルを選びます。「媒体」列(X・Instagram など)と「画像URL」列があると自動で対応します。取り込んでも下書き・予約・公開は作られません。同じ管理IDは重複登録されません。
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
      <textarea className="h-24 w-full rounded-lg border p-2 text-xs" placeholder="ここに表を貼り付け(1行目が見出し)" value={text} onChange={(e) => { setText(e.target.value); setRes(null); }} />
      <div className="flex gap-2">
        <button disabled={busy || !text.trim()} onClick={() => run(true)} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40">プレビュー</button>
        <button disabled={busy || !res || (res.summary.new + res.summary.updated === 0)} onClick={() => run(false)} className="rounded-lg bg-neutral-900 px-3 py-1 text-sm text-white disabled:opacity-40">この内容で取り込む</button>
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
  if (!dup.matches.length) return <p className="text-xs text-emerald-700">似た投稿は見つかりませんでした(検索対象 {dup.searched}件)。</p>;
  return (
    <div className="space-y-2">
      {dup.matches.map((m) => (
        <div key={`${m.source}:${m.id}`} className="rounded-lg border p-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono">{m.managementId ?? m.id}</span>
            <span className="text-neutral-500">{m.stateLabel}</span>
            {m.kindLabels.map((k) => <span key={k} className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{k}</span>)}
          </div>
          {m.title && <div className="mt-1 font-semibold">{m.title}</div>}
          <div className="mt-1 whitespace-pre-wrap text-neutral-700">{m.text}</div>
          <ul className="mt-1 list-disc pl-5 text-neutral-500">{m.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

/** 画像の貼り付け・ドロップ・選択。投稿には画像が必須 */
function MediaBox({ urls, busy, onChange, hint }: { urls: string[]; busy: boolean; onChange: (u: string[]) => Promise<void>; hint?: string }) {
  const [up, setUp] = useState(false);
  const [err, setErr] = useState('');
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = async (files: File[]) => {
    if (!files.length) return;
    setUp(true);
    setErr('');
    try {
      const added: string[] = [];
      for (const f of files.slice(0, 6 - urls.length)) added.push(await uploadFile(f));
      await onChange([...urls, ...added]);
    } catch (e) { setErr(e instanceof Error ? e.message : 'アップロードに失敗しました'); } finally { setUp(false); }
  };

  return (
    <div
      data-media-box
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void add(Array.from(e.dataTransfer.files)); }}
      className={`rounded-lg border border-dashed p-2 ${over ? 'border-violet-500 bg-violet-50' : urls.length ? 'border-neutral-300' : 'border-rose-300 bg-rose-50/50'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {urls.map((u, i) => (
          <div key={u} className="group relative h-16 w-16 overflow-hidden rounded-md border bg-neutral-100">
            {isVideoUrl(u) ? <video src={u} className="h-full w-full object-cover" muted /> : <img src={u} alt="" className="h-full w-full object-cover" />}
            <button type="button" title="外す" disabled={busy || up} onClick={() => void onChange(urls.filter((_, k) => k !== i))} className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {urls.length < 6 && (
          <button type="button" disabled={busy || up} onClick={() => inputRef.current?.click()} className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-md border bg-white text-[10px] text-neutral-500 hover:bg-neutral-50 disabled:opacity-40">
            <ImagePlus className="h-4 w-4" />{up ? '送信中' : '画像'}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { void add(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <div className="min-w-0 flex-1 text-[11px] text-neutral-500">
          {urls.length === 0 ? <span className="font-semibold text-rose-600">画像が必須です。</span> : null}
          ここに画像をドラッグ、またはこの画面で Ctrl+V で貼り付け
          {hint && <div className="mt-0.5 truncate text-neutral-400" title={hint}>画像案: {hint}</div>}
        </div>
      </div>
      {err && <p className="mt-1 text-xs text-rose-700">{err}</p>}
    </div>
  );
}

interface DetailProps { id: string; list: ListRes; reload: () => void; onToggleAi: () => void }

/** 中央(編集)と右(スマホプレビュー)の2列を返す */
function Workspace({ id, list, reload, onToggleAi }: DetailProps) {
  const [c, setC] = useState<Candidate | null>(null);
  const [dup, setDup] = useState<Dup | null>(null);
  const [body, setBody] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [when, setWhen] = useState('');
  const [platform, setPlatform] = useState('x_thread');
  const [asSchedule, setAsSchedule] = useState(true);
  const [previewPlatform, setPreviewPlatform] = useState('');

  const load = useCallback(async () => {
    setMsg('');
    const r = await call<{ candidate: Candidate }>(`/${encodeURIComponent(id)}`);
    setC(r.candidate);
    setPlatform(r.candidate.platform || 'x_thread');
    setBody(r.candidate.body);
    setNote(r.candidate.editNotes);
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
  /** 画像の保存。入力中の本文は消さない */
  const saveMedia = async (urls: string[]) => {
    const r = await call<{ candidate: Candidate }>(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: { mediaUrls: urls } });
    setC((prev) => (prev ? { ...prev, mediaUrls: r.candidate.mediaUrls } : r.candidate));
    reload();
  };
  // 類似投稿の確認は全件比較で重いので、「過去の類似投稿」を開いたときだけ実行する
  const dupAsked = useRef(false);
  const check = async (ai: boolean) => {
    dupAsked.current = true;
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

  // 画像のクリップボード貼り付け(この編集欄のどこでも Ctrl+V)
  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (!files.length || !c) return;
    e.preventDefault();
    setBusy(true);
    (async () => {
      try {
        const added: string[] = [];
        for (const f of files.slice(0, 6 - c.mediaUrls.length)) added.push(await uploadFile(f));
        await saveMedia([...c.mediaUrls, ...added]);
      } catch (er) { setMsg(er instanceof Error ? er.message : 'アップロードに失敗しました'); } finally { setBusy(false); }
    })();
  };

  if (!c) {
    return (
      <>
        <div className="min-h-0 overflow-y-auto rounded-xl border bg-white p-4"><p className="text-sm text-neutral-500">{msg || '読み込み中…'}</p></div>
        <div className="hidden min-h-0 lg:block" />
      </>
    );
  }
  const dirty = body !== c.body || note !== c.editNotes;
  const noImage = c.mediaUrls.length === 0;
  const extras = Object.entries(c.extra);
  const hasMore = !!(c.checkNotes || c.theme || c.conclusion || c.punchline || extras.length);

  return (
    <>
      <div className="min-h-0 space-y-3 overflow-y-auto rounded-xl border bg-white p-3" onPaste={onPaste}>
        <div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-mono">{c.managementId}</span>
            <Badge s={c.selection} />
            {c.series && <span className="rounded-full bg-neutral-100 px-2 py-px">{c.series}</span>}
            {c.rating && <span className="text-neutral-500">評価: {c.rating}</span>}
            <span className={`rounded-full px-2 py-px ${STATUS[c.status]?.cls ?? ''}`}>{STATUS[c.status]?.label}</span>
            {c.source && SOURCE_LABEL[c.source] && <span className="text-[11px] text-neutral-400">{SOURCE_LABEL[c.source]}</span>}
            <label className="ml-auto flex items-center gap-1">
              <span className="text-neutral-500">投稿先</span>
              <select className="rounded border p-0.5" value={c.platform} disabled={busy} onChange={(e) => patch({ platform: e.target.value })}>
                <option value="">未設定</option>
                {PLATFORMS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </label>
          </div>
          <h2 className="mt-1 text-base font-bold">{c.title || '(タイトルなし)'}</h2>
        </div>

        <div>
          <textarea className="h-36 w-full rounded-lg border p-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)} placeholder="投稿本文" />
          <div className="mt-1 flex items-center gap-2">
            <input className="min-w-0 flex-1 rounded-lg border p-1.5 text-xs" value={note} onChange={(e) => setNote(e.target.value)} placeholder="編集メモ(投稿されません)" />
            <button disabled={!dirty || busy} onClick={() => patch({ body, editNotes: note })} className="shrink-0 rounded-lg border px-3 py-1 text-xs font-semibold disabled:opacity-40">保存</button>
          </div>
        </div>

        <MediaBox urls={c.mediaUrls} busy={busy} onChange={saveMedia} hint={c.imageIdea} />

        {c.aiSuggestion && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-2 text-xs">
            <div className="font-semibold text-violet-700">AIからの改善提案(採否は人が決めます)</div>
            <div className="mt-1 whitespace-pre-wrap">{c.aiSuggestion}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {(['adopted', 'needs_fix', 'hold', 'rejected'] as Selection[]).map((s) => (
            <button key={s} disabled={busy || c.selection === s} onClick={() => patch({ selection: s })} className={`rounded-md border px-2 py-0.5 text-xs font-semibold disabled:opacity-40 ${c.selection === s ? SEL[s].cls : ''}`}>{SEL[s].label}</button>
          ))}
          {c.selection !== 'unreviewed' && <button disabled={busy} onClick={() => patch({ selection: 'unreviewed' })} className="rounded-md border px-2 py-0.5 text-xs text-neutral-500">未選定に戻す</button>}
        </div>

        {c.status === 'candidate' && c.selection !== 'rejected' && (
          <div className="space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold">投稿予定</span>
              <input type="datetime-local" className="rounded border p-0.5 text-xs" value={when} onChange={(e) => setWhen(e.target.value)} />
              <select className="rounded border p-0.5 text-xs" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
              <label className="text-[11px]"><input type="checkbox" checked={!asSchedule} onChange={(e) => setAsSchedule(!e.target.checked)} /> 下書きにする</label>
              <button disabled={busy || !when || noImage} title={noImage ? '画像を追加してください' : undefined} onClick={toJob} className="rounded-lg bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-40">{asSchedule ? '予約する' : '下書きにする'}</button>
            </div>
            <p className="text-[11px] text-neutral-500">{noImage ? '画像が必須です。先に画像を追加してください。' : '予約すると「採用」になり、時間になったら自動投稿(未連携の媒体は通知)。ダッシュボード・カレンダーに出ます。'}</p>
          </div>
        )}
        {c.status !== 'candidate' && (
          <p className="rounded-lg bg-neutral-50 p-2 text-xs text-neutral-600">
            {STATUS[c.status]?.label}{c.scheduledAt ? `(${new Date(c.scheduledAt).toLocaleString('ja-JP')})` : ''}。確認・変更は <Link to="/calendar" className="underline">週表示・編集</Link> で行えます。
          </p>
        )}
        {msg && <p className="text-xs text-neutral-700">{msg}</p>}

        {hasMore && (
          <details className="rounded-lg border p-2 text-xs">
            <summary className="cursor-pointer font-semibold text-neutral-600">詳細情報</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {c.checkNotes && <div><div className="font-semibold text-neutral-500">確認事項</div><div className="whitespace-pre-wrap">{c.checkNotes}</div></div>}
              {c.theme && <div><div className="font-semibold text-neutral-500">テーマ</div>{c.theme}</div>}
              {c.conclusion && <div><div className="font-semibold text-neutral-500">結論</div>{c.conclusion}</div>}
              {c.punchline && <div><div className="font-semibold text-neutral-500">オチ</div>{c.punchline}</div>}
              {extras.map(([k, v]) => <div key={k}><div className="font-semibold text-neutral-500">{k}</div><div className="whitespace-pre-wrap">{v}</div></div>)}
            </div>
          </details>
        )}

        <details
          className="rounded-lg border p-2 text-xs"
          onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open && !dupAsked.current) void check(false); }}
        >
          <summary className="cursor-pointer font-semibold text-neutral-600">
            過去の類似投稿{dup ? `(${dup.matches.length}件)` : ''}
          </summary>
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button disabled={busy} onClick={() => check(false)} className="rounded border px-2 py-0.5">ルールで再確認</button>
              <button disabled={busy} onClick={() => check(true)} className="rounded border px-2 py-0.5">AIでも判定する</button>
              <label className="flex items-center gap-1"><input type="checkbox" checked={list.prefs.useAi} onChange={onToggleAi} />常にAIも使う</label>
            </div>
            <p className="text-[11px] text-neutral-500">
              AI判定には{list.ai.mode === 'own' ? `あなたのAIキー(${list.ai.provider})` : `運営AI${list.ai.usage ? `(今月 ${list.ai.usage.used}/${list.ai.usage.limit}回)` : ''}`}を使います。切り替えは <Link to="/settings" className="underline">設定 &gt; キャラ・AI</Link>。
            </p>
            {dup?.aiNote && <p className="text-violet-700">{dup.aiNote}</p>}
            {dup ? <DupList dup={dup} /> : <p className="text-neutral-500">確認中…</p>}
            {dup && <p className="text-[11px] text-neutral-400">{dup.note}</p>}
          </div>
        </details>
      </div>

      <div className="min-h-0 overflow-y-auto rounded-xl border bg-neutral-50 p-3">
        <CandidatePreview platform={previewPlatform || c.platform} body={body} mediaUrls={c.mediaUrls} onPlatformChange={setPreviewPlatform} />
      </div>
    </>
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
  const [showQuick, setShowQuick] = useState(false);
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
    // 同期は重いので、10分以内に実施済みなら呼ばない
    const KEY = 'buzzit-candidates-synced-at';
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 10 * 60_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
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

  const quickTarget = quickPlatform || (platformSel && platformSel !== 'none' ? platformSel : '');
  const addQuick = async () => {
    try {
      const r = await call<{ candidate: Candidate }>('/', { method: 'POST', body: { body: quick, platform: quickTarget } });
      setQuick('');
      setShowQuick(false);
      await reload();
      setOpenId(r.candidate.id);
    } catch (e) { setErr(e instanceof Error ? e.message : '追加できませんでした'); }
  };
  useEffect(() => { const t = setTimeout(() => void reload(), 400); return () => clearTimeout(t); }, [reload]);

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

  const total = data?.counts.all ?? 0;
  const platChips = useMemo(
    () => [{ id: '', short: '全', name: 'すべてのSNS', color: '#171717', n: total }, ...PLATFORM_META.map((p) => ({ ...p, n: data?.platformCounts[p.id] ?? 0 })), ...((data?.platformCounts.none ?? 0) > 0 ? [{ id: 'none', short: '未', name: '媒体未設定', color: '#d97706', n: data?.platformCounts.none ?? 0 }] : [])],
    [data, total],
  );
  const selectCls = 'h-7 rounded-md border bg-white px-1.5 text-xs';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* 1行のコンパクトなツールバー: 媒体(アイコン) / 進み具合 / 選定 / シリーズ / 検索 / 追加・取込・CSV */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border bg-white px-2 py-1.5">
        <div className="flex items-center gap-1">
          {platChips.map((p) => {
            const on = platformSel === p.id;
            return (
              <button
                key={p.id || 'all'}
                type="button"
                title={`${p.name} ${p.n}件`}
                onClick={() => setPlatformSel(p.id)}
                style={on ? { backgroundColor: p.color, borderColor: p.color } : undefined}
                className={`relative flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border px-1.5 text-[11px] font-bold ${on ? 'text-white' : 'bg-white text-neutral-700 hover:bg-neutral-50'}`}
              >
                {p.short}
                <span className={`ml-0.5 text-[9px] font-semibold ${on ? 'text-white/80' : 'text-neutral-400'}`}>{p.n}</span>
              </button>
            );
          })}
        </div>
        <span className="hidden h-5 w-px bg-neutral-200 sm:block" />
        {data && (
          <select className={selectCls} value={stSel} onChange={(e) => setStSel(e.target.value)} title="進み具合">
            <option value="">進み具合: すべて</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label} {data.statusCounts[k] ?? 0}</option>)}
          </select>
        )}
        {data && (
          <select className={selectCls} value={sel} onChange={(e) => setSel(e.target.value)} title="選定状況">
            <option value="">選定: すべて</option>
            {(Object.keys(SEL) as Selection[]).map((k) => <option key={k} value={k}>{SEL[k].label} {data.counts[k] ?? 0}</option>)}
          </select>
        )}
        {data && data.series.length > 0 && (
          <select className={`${selectCls} max-w-[9rem]`} value={series} onChange={(e) => setSeries(e.target.value)}>
            <option value="">全シリーズ</option>
            {data.series.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <label className="relative">
          <Search className="pointer-events-none absolute left-1.5 top-1.5 h-4 w-4 text-neutral-400" />
          <input className="h-7 w-36 rounded-md border pl-6 pr-1.5 text-xs" placeholder="ID・本文で検索" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" title="ネタを追加" onClick={() => setShowQuick(!showQuick)} className={`flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-semibold ${showQuick ? 'bg-neutral-900 text-white' : 'bg-white'}`}><Plus className="h-4 w-4" />追加</button>
          <button type="button" title="スプレッドシート/CSVから取り込む" onClick={() => setShowImport(!showImport)} className={`flex h-7 w-7 items-center justify-center rounded-md border ${showImport ? 'bg-neutral-900 text-white' : 'bg-white'}`}><Upload className="h-4 w-4" /></button>
          <button type="button" title="CSVで書き出す(バックアップ)" onClick={exportCsv} className="flex h-7 w-7 items-center justify-center rounded-md border bg-white"><Download className="h-4 w-4" /></button>
        </div>
      </div>

      {(err || syncMsg) && (
        <div className="shrink-0 text-xs">
          {err && <p className="text-rose-700">{err}</p>}
          {syncMsg && <p className="text-emerald-700">{syncMsg}</p>}
        </div>
      )}

      {showQuick && (
        <div className="flex shrink-0 flex-wrap items-start gap-2 rounded-xl border bg-white p-2">
          <textarea className="h-14 min-w-[16rem] flex-1 rounded-lg border p-2 text-sm" placeholder="ネタ・投稿文を書く" value={quick} onChange={(e) => setQuick(e.target.value)} />
          <select className={selectCls} value={quickTarget} onChange={(e) => setQuickPlatform(e.target.value)} title="どのSNS用か(必須)">
            <option value="">媒体を選ぶ(必須)</option>
            {PLATFORMS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <button disabled={!quick.trim() || !quickTarget} onClick={addQuick} className="h-7 rounded-lg bg-neutral-900 px-3 text-xs text-white disabled:opacity-40">候補に追加</button>
        </div>
      )}

      {platformSel === 'none' && data && (data.platformCounts.none ?? 0) > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-xs">
          <span>媒体未設定 {data.platformCounts.none}件 を</span>
          <select className="rounded border p-0.5" value={bulkPlatform} onChange={(e) => setBulkPlatform(e.target.value)}>
            <option value="">媒体を選ぶ</option>
            {PLATFORMS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <button disabled={!bulkPlatform} onClick={bulkSet} className="rounded-lg bg-neutral-900 px-2 py-0.5 text-white disabled:opacity-40">まとめて設定</button>
        </div>
      )}
      {platformSel !== '' && platformSel !== 'none' && RULE_ID_OF[platformSel] && <SnsRulesBox ruleId={RULE_ID_OF[platformSel]} />}
      {showImport && <div className="max-h-[40vh] shrink-0 overflow-y-auto"><ImportPanel onDone={reload} /></div>}

      {/* 3列: 一覧 / 編集 / スマホプレビュー(それぞれ単独でスクロール) */}
      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(200px,0.9fr)_minmax(0,1.7fr)_320px] lg:grid-rows-[minmax(0,1fr)]">
        <div className="max-h-[50vh] min-h-0 space-y-0.5 overflow-y-auto rounded-xl border bg-white p-1.5 lg:max-h-none">
          {data?.candidates.map((c) => (
            <button key={c.id} onClick={() => setOpenId(c.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-50 ${openId === c.id ? 'bg-neutral-100' : ''}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-neutral-50">
                {c.mediaUrls[0] && !isVideoUrl(c.mediaUrls[0]) ? <img src={c.mediaUrls[0]} alt="" className="h-full w-full object-cover" /> : <ImageOff className={`h-4 w-4 ${c.mediaUrls[0] ? 'text-neutral-400' : 'text-rose-400'}`} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-neutral-500">{c.managementId}</span>
                  <Badge s={c.selection} />
                  {c.status !== 'candidate' && <span className={`rounded-full px-1.5 text-[10px] ${STATUS[c.status]?.cls}`}>{STATUS[c.status]?.label}</span>}
                  <span className="ml-auto text-[10px] font-semibold text-neutral-500">{PLATFORM_META.find((p) => p.id === c.platform)?.short ?? '未'}</span>
                </span>
                <span className="block truncate text-[13px] font-semibold">{c.title || c.body.slice(0, 40)}</span>
              </span>
            </button>
          ))}
          {data && data.candidates.length === 0 && <p className="p-4 text-sm text-neutral-500">候補がありません。「追加」か取り込みから入れてください。</p>}
        </div>
        {openId && data ? (
          <Workspace key={openId} id={openId} list={data} reload={reload} onToggleAi={togglePref} />
        ) : (
          <>
            <div className="min-h-0 rounded-xl border bg-white p-4"><p className="text-sm text-neutral-500">左の一覧から候補を選ぶと、本文・画像・類似投稿をここで編集できます。</p></div>
            <div className="hidden min-h-0 overflow-y-auto rounded-xl border bg-neutral-50 p-3 lg:block"><CandidatePreview platform="x_thread" body="" mediaUrls={[]} /></div>
          </>
        )}
      </div>
    </div>
  );
}
