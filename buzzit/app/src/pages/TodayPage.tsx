import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';
import { fetchScheduledJobs, fetchSettings, markScheduledPosted, updateScheduledJob, type ScheduledJob } from '../lib/api';
import { usePersona } from '../store/personaContext';
import PlatformBadge from '../components/PlatformBadge';

const COMPOSE_URL: Record<string, (text: string) => string> = {
  x_thread: (t) => `https://x.com/intent/post?text=${encodeURIComponent(t)}`,
  threads: (t) => `https://www.threads.net/intent/post?text=${encodeURIComponent(t)}`,
  facebook: () => 'https://www.facebook.com/',
  instagram: () => 'https://www.instagram.com/',
  reels: () => 'https://www.instagram.com/',
  carousel: () => 'https://www.instagram.com/',
  line: () => 'https://manager.line.biz/',
  gbp: () => 'https://business.google.com/',
  youtube_shorts: () => 'https://studio.youtube.com/',
  tiktok: () => 'https://www.tiktok.com/upload',
};

const isVideoUrl = (u: string) => /\.(mp4|mov|webm)(\?|$)/i.test(u);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function CopyButton({ text, label = 'コピー' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-neutral-900"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'コピーしました' : label}
    </button>
  );
}

function DraftConfirmRow({
  job,
  onDone,
  xConnected,
  selected,
  onToggle,
}: {
  job: ScheduledJob;
  onDone: () => void;
  xConnected: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const hasX = job.contents.some((c) => c.platform === 'x_thread');
  const [mode, setMode] = useState<'notify' | 'x_free'>(xConnected && hasX ? 'x_free' : 'notify');
  const [when, setWhen] = useState(() => toLocalInput(job.scheduledAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const text = job.contents.map((c) => `【${c.label}】\n${c.content}`).join('\n\n');

  const confirm = async () => {
    const at = new Date(when);
    if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) {
      setError('未来の日時を指定してください');
      return;
    }
    const label = at.toLocaleString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    if (!window.confirm(`${label} にこの投稿を予約します。よろしいですか？\n\n${text.slice(0, 200)}`)) return;
    setBusy(true);
    setError('');
    try {
      await updateScheduledJob(job.id, { scheduledAt: at.toISOString(), publishMode: mode });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : '予約に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label="選択" />
        {job.contents.map((c) => (
          <PlatformBadge key={c.platform} platformId={c.platform} showLabel />
        ))}
        {job.createdBy === 'ai' && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">AI作成</span>}
        {job.tags?.map((t) => (
          <span key={t}>#{t}</span>
        ))}
      </div>
      <p className="line-clamp-3 whitespace-pre-wrap text-sm text-neutral-800">{job.contents[0]?.content}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        {hasX && xConnected && (
          <select value={mode} onChange={(e) => setMode(e.target.value as 'notify' | 'x_free')} className="border border-neutral-300 px-2 py-1 text-xs">
            <option value="x_free">Xへ自動投稿</option>
            <option value="notify">通知のみ（手動投稿）</option>
          </select>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={confirm}
          className="bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          この日時で予約する
        </button>
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </div>
  );
}

function TodoCard({ job, onDone }: { job: ScheduledJob; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const overdue = !sameDay(new Date(job.scheduledAt), new Date());
  const media = job.mediaUrls ?? [];

  const posted = async () => {
    setBusy(true);
    try {
      await markScheduledPosted(job.id);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900">
          {new Date(job.scheduledAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {overdue && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">期限超過</span>}
          {job.status === 'notified' && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">通知済み・投稿待ち</span>}
          {job.status === 'failed' && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800">失敗</span>}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={posted}
          className="inline-flex items-center gap-1 bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          投稿しました
        </button>
      </div>

      {media.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {media.map((u, i) => (
            <a
              key={u}
              href={u}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 border border-neutral-300 px-2 py-1 text-xs hover:border-neutral-900"
            >
              <Download className="h-3.5 w-3.5" />
              {isVideoUrl(u) ? '動画' : '画像'}
              {i + 1} を保存
            </a>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {job.contents.map((c, idx) => {
          const parts = c.platform === 'x_thread' ? c.content.split(/\n---\n/).map((p) => p.trim()).filter(Boolean) : [c.content];
          const open = COMPOSE_URL[c.platform]?.(parts[0] ?? c.content);
          return (
            <div key={`${c.platform}-${idx}`} className="rounded border border-neutral-100 bg-neutral-50 p-2">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <PlatformBadge platformId={c.platform} showLabel />
                <div className="flex flex-wrap gap-1.5">
                  <CopyButton text={c.content.replace(/\n---\n/g, '\n\n')} label="全文コピー" />
                  {open && (
                    <a
                      href={open}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 border border-neutral-900 px-2.5 py-1 text-xs font-medium hover:bg-neutral-900 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      投稿画面を開く
                    </a>
                  )}
                </div>
              </div>
              {parts.map((p, i) => (
                <div key={i} className="mt-1 flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap text-sm text-neutral-800">{p}</p>
                  {parts.length > 1 && <CopyButton text={p} label={`${i + 1}本目`} />}
                </div>
              ))}
              {c.platform === 'x_thread' && (
                <p className="mt-1 text-[11px] text-neutral-500">
                  Xの投稿画面で「予約」を選べば、X側の予約投稿になります（画像は別途添付）。スレッドは1本目を開き、続きは返信に貼ります。
                </p>
              )}
            </div>
          );
        })}
      </div>
      {job.aiGeneratedMedia && <p className="mt-2 text-[11px] text-neutral-500">※ AI生成メディアを含みます。各SNSの「AI生成」ラベルをオンにして投稿してください。</p>}
    </div>
  );
}

/** 今日の投稿: 本文コピー・画像保存・投稿画面を開く・「投稿しました」まで1画面で完了 */
export default function TodayPage() {
  const { activePersonaId } = usePersona();
  const [jobs, setJobs] = useState<ScheduledJob[] | null>(null);
  const [error, setError] = useState('');
  const [xConnected, setXConnected] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState('');

  useEffect(() => {
    fetchSettings().then((st) => setXConnected(!!st.xConnected)).catch(() => undefined);
  }, []);

  const load = useCallback(() => {
    if (!activePersonaId) return;
    fetchScheduledJobs(undefined, activePersonaId)
      .then((r) => setJobs(r.jobs))
      .catch((e) => setError(e instanceof Error ? e.message : '読み込みに失敗しました'));
  }, [activePersonaId]);

  useEffect(load, [load]);

  const now = new Date();
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const todos = (jobs ?? [])
    .filter((j) => {
      const t = new Date(j.scheduledAt).getTime();
      if (j.status === 'notified' || j.status === 'failed') return t > Date.now() - 14 * 86400000;
      return (j.status === 'pending' || j.status === 'pending_approval') && t < endToday;
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const drafts = (jobs ?? []).filter((j) => j.status === 'draft').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const toggle = (id: string) =>
    setSel((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const picked = drafts.filter((j) => sel.has(j.id));
  const bulk = async (kind: 'reserve' | 'shift' | 'tag') => {
    if (picked.length === 0) return;
    setBulkMsg('');
    try {
      if (kind === 'reserve') {
        const ok = picked.filter((j) => new Date(j.scheduledAt).getTime() > Date.now());
        if (ok.length === 0) return setBulkMsg('未来の日時の下書きがありません。日時をずらしてください');
        const range = ok.map((j) => new Date(j.scheduledAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })).join('\n');
        if (!window.confirm(`次の ${ok.length} 件を、それぞれの日時で予約します（通知モード）。\n\n${range}`)) return;
        for (const j of ok) await updateScheduledJob(j.id, { publishMode: xConnected && j.contents.some((c) => c.platform === 'x_thread') ? 'x_free' : 'notify' });
        setBulkMsg(`${ok.length}件を予約しました${ok.length < picked.length ? `（過去日時の ${picked.length - ok.length} 件は除外）` : ''}`);
      } else if (kind === 'shift') {
        const d = Number(window.prompt('何日ずらしますか？（例: 1 / -1）', '1'));
        if (!d || Number.isNaN(d)) return;
        for (const j of picked) await updateScheduledJob(j.id, { scheduledAt: new Date(new Date(j.scheduledAt).getTime() + d * 86400000).toISOString() });
        setBulkMsg(`${picked.length}件の日時を${d}日ずらしました`);
      } else {
        const t = (window.prompt('追加するタグ（空白区切り）') ?? '').split(/[\s,、]+/).map((x) => x.replace(/^[#＃]/, '')).filter(Boolean);
        if (t.length === 0) return;
        for (const j of picked) await updateScheduledJob(j.id, { tags: [...new Set([...(j.tags ?? []), ...t])].slice(0, 10) });
        setBulkMsg(`${picked.length}件にタグを追加しました`);
      }
      setSel(new Set());
      load();
    } catch (e) {
      setBulkMsg(e instanceof Error ? e.message : '一括操作に失敗しました');
    }
  };
  const upcoming = (jobs ?? []).filter((j) => j.status === 'pending' && new Date(j.scheduledAt).getTime() >= endToday).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">今日の投稿</h1>
        <p className="text-sm text-neutral-600">
          投稿はあなたが確認してボタンを押して行います。本文をコピー → 投稿画面を開く → 投稿したら「投稿しました」を押してください。
        </p>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {jobs === null && !error && <p className="text-sm text-neutral-500">読み込み中…</p>}

      {jobs !== null && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-800">今日やること（{todos.length}件）</h2>
          {todos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
              今日の投稿はありません。{upcoming > 0 ? `この先の予約が${upcoming}件あります。` : '下の下書きから日時を決めて予約しましょう。'}
            </p>
          ) : (
            todos.map((j) => <TodoCard key={j.id} job={j} onDone={load} />)
          )}
        </section>
      )}

      {drafts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-800">日時の確定待ちの下書き（{drafts.length}件）</h2>
          <p className="text-xs text-neutral-500">日時を確認して「予約する」を押すと予約されます。Xは「Xへ自動投稿」を選ぶと指定時刻に自動で投稿、それ以外は時刻に通知が届きます。</p>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={picked.length === drafts.length} onChange={(e) => setSel(e.target.checked ? new Set(drafts.map((d) => d.id)) : new Set())} />
              すべて選択（{picked.length}/{drafts.length}）
            </label>
            <button type="button" disabled={!picked.length} onClick={() => bulk('reserve')} className="border border-neutral-900 px-2.5 py-1 font-medium disabled:opacity-40">選択を一括予約</button>
            <button type="button" disabled={!picked.length} onClick={() => bulk('shift')} className="border border-neutral-300 px-2.5 py-1 disabled:opacity-40">日付をずらす</button>
            <button type="button" disabled={!picked.length} onClick={() => bulk('tag')} className="border border-neutral-300 px-2.5 py-1 disabled:opacity-40">タグ追加</button>
            {bulkMsg && <span className="text-neutral-700">{bulkMsg}</span>}
          </div>
          {drafts.map((j) => (
            <DraftConfirmRow key={j.id} job={j} onDone={load} xConnected={xConnected} selected={sel.has(j.id)} onToggle={() => toggle(j.id)} />
          ))}
        </section>
      )}
    </div>
  );
}
