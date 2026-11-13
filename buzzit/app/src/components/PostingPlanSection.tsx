import { useEffect, useState } from 'react';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import { authFetch } from '../lib/api';
import { usePersona } from '../store/personaContext';

interface Slot {
  id: string;
  weekday: number;
  time: string;
  platform: string;
  theme: string;
  tags: string[];
}

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const PLATFORMS: Array<[string, string]> = [
  ['x_thread', 'X'],
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['threads', 'Threads'],
  ['line', 'LINE'],
  ['gbp', 'Googleビジネス'],
  ['youtube_shorts', 'YouTube Shorts'],
  ['tiktok', 'TikTok'],
];

/** 投稿計画: 曜日×時刻×媒体×テーマの枠。AIが空き枠だけを埋める（plan_gaps） */
export default function PostingPlanSection() {
  const { activePersona } = usePersona();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authFetch('/v1/agent/plan')
      .then((r) => r.json())
      .then((d) => setSlots(((d.slots ?? []) as Slot[]).map((s) => ({ ...s, tags: s.tags ?? [] }))))
      .catch(() => {});
  }, [activePersona?.id]);

  if (!activePersona) return null;

  const update = (id: string, patch: Partial<Slot>) => setSlots((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await authFetch('/v1/agent/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? '保存に失敗しました');
      setSlots(d.slots);
      setMsg('保存しました。AIに「plan_gaps の空き枠を埋めて」と頼むと、この計画どおりに下書きが作られます。');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存に失敗しました');
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <CalendarRange className="h-5 w-5 text-neutral-700" />
        投稿計画（「{activePersona.name}」）
      </h3>
      <p className="text-sm text-neutral-600">
        曜日・時刻・媒体・テーマの「枠」を決めておくと、AIが空いている枠だけを過去投稿と被らないように埋めます。
      </p>

      <div className="space-y-2">
        {slots.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 p-2 text-sm">
            <select value={s.weekday} onChange={(e) => update(s.id, { weekday: Number(e.target.value) })} className="rounded border border-neutral-300 px-2 py-1">
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}曜
                </option>
              ))}
            </select>
            <input type="time" value={s.time} onChange={(e) => update(s.id, { time: e.target.value })} className="rounded border border-neutral-300 px-2 py-1" />
            <select value={s.platform} onChange={(e) => update(s.id, { platform: e.target.value })} className="rounded border border-neutral-300 px-2 py-1">
              {PLATFORMS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input
              value={s.theme}
              onChange={(e) => update(s.id, { theme: e.target.value })}
              placeholder="テーマ（例: 医療制度をやさしく）"
              className="min-w-[10rem] flex-1 rounded border border-neutral-300 px-2 py-1"
            />
            <input
              value={s.tags.join(',')}
              onChange={(e) => update(s.id, { tags: e.target.value.split(/[,、]/).map((t) => t.replace(/^[#＃]/, '').trim()).filter(Boolean) })}
              placeholder="タグ（カンマ区切り）"
              className="w-40 rounded border border-neutral-300 px-2 py-1"
            />
            <button type="button" aria-label="削除" onClick={() => setSlots((l) => l.filter((x) => x.id !== s.id))} className="text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {slots.length === 0 && <p className="text-xs text-neutral-500">まだ枠がありません。</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSlots((l) => [...l, { id: `s${Date.now()}`, weekday: 1, time: '12:00', platform: 'x_thread', theme: '', tags: [] }])}
          className="buzz-btn-secondary !px-3 !py-1.5 text-sm"
        >
          <Plus className="mr-1 inline h-4 w-4" />
          枠を追加
        </button>
        <button type="button" onClick={save} disabled={busy} className="buzz-btn-primary !px-4 !py-1.5 text-sm disabled:opacity-70">
          {busy ? '保存中…' : '計画を保存'}
        </button>
      </div>
      {msg && <p className="text-xs text-neutral-700">{msg}</p>}
    </div>
  );
}
