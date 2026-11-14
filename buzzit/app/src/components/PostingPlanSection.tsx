import { useEffect, useState } from 'react';
import { CalendarRange, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { authFetch } from '../lib/api';
import { usePersona } from '../store/personaContext';

interface Slot {
  id: string;
  weekday: number;
  time: string;
  platform: string;
  theme: string;
  tags: string[];
  seriesName?: string;
  purpose?: string;
  audience?: string;
  category?: string;
  tone?: string;
  mediaKind?: string;
  rules?: string;
  ngRules?: string;
  product?: string;
  active?: boolean;
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

const inputCls = 'rounded border border-neutral-300 px-2 py-1';

/** 投稿計画（投稿シリーズ）: 曜日×時刻×媒体の枠に、シリーズ名・目的・トーン・ルールを持たせる。AIが空き枠だけを埋める（plan_gaps） */
export default function PostingPlanSection() {
  const { activePersona } = usePersona();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());
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
  const toggle = (id: string) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

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
      setSlots((d.slots as Slot[]).map((s) => ({ ...s, tags: s.tags ?? [] })));
      setMsg('保存しました（下書き・投稿予約は作られていません）。AIに「plan_gaps の空き枠を埋めて」と頼むと、この計画どおりに下書きが作られます。');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存に失敗しました');
    }
    setBusy(false);
  };

  const field = (s: Slot, key: keyof Slot, label: string, placeholder: string, wide = false) => (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11px] text-neutral-500">{label}</span>
      <input
        value={(s[key] as string | undefined) ?? ''}
        onChange={(e) => update(s.id, { [key]: e.target.value } as Partial<Slot>)}
        placeholder={placeholder}
        className={`${inputCls} w-full`}
      />
    </label>
  );

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <CalendarRange className="h-5 w-5 text-neutral-700" />
        投稿計画・投稿シリーズ（「{activePersona.name}」）
      </h3>
      <p className="text-sm text-neutral-600">
        曜日・時刻・媒体の「枠」に、シリーズ名・目的・口調・禁止事項を決めておくと、AIが空いている枠だけを過去投稿と被らないように、シリーズの方針どおり下書きにします。
        枠を登録・変更しても、既存の投稿・予約は変わりません。
      </p>

      <div className="space-y-2">
        {slots.map((s) => {
          const expanded = open.has(s.id);
          const inactive = s.active === false;
          return (
            <div key={s.id} className={`rounded-lg border p-2 text-sm ${inactive ? 'border-neutral-200 bg-neutral-50 opacity-70' : 'border-neutral-200'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" aria-label="詳細" onClick={() => toggle(s.id)} className="text-neutral-500">
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <select value={s.weekday} onChange={(e) => update(s.id, { weekday: Number(e.target.value) })} className={inputCls}>
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>{d}曜</option>
                  ))}
                </select>
                <input type="time" value={s.time} onChange={(e) => update(s.id, { time: e.target.value })} className={inputCls} />
                <select value={s.platform} onChange={(e) => update(s.id, { platform: e.target.value })} className={inputCls}>
                  {PLATFORMS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <input
                  value={s.seriesName ?? ''}
                  onChange={(e) => update(s.id, { seriesName: e.target.value })}
                  placeholder="シリーズ名（例: 3分でわかる医療制度）"
                  className={`${inputCls} min-w-[10rem] flex-1`}
                />
                <label className="flex items-center gap-1 text-xs text-neutral-600">
                  <input type="checkbox" checked={!inactive} onChange={(e) => update(s.id, { active: e.target.checked ? undefined : false })} />
                  有効
                </label>
                <button type="button" aria-label="削除" onClick={() => setSlots((l) => l.filter((x) => x.id !== s.id))} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {expanded && (
                <div className="mt-2 grid gap-2 border-t border-neutral-100 pt-2 sm:grid-cols-2">
                  {field(s, 'purpose', '主な目的', '共感・認知拡大 / 専門性・保存 など')}
                  {field(s, 'theme', 'テーマ', '例: 医療制度をやさしく')}
                  {field(s, 'audience', 'ターゲット読者', '例: クリニックの事務長・医師')}
                  {field(s, 'category', 'コンテンツカテゴリ', '例: 医療制度 / AI / 開発')}
                  {field(s, 'tone', '文章のトーン', '例: 行動が早く少し生意気。患者やスタッフを見下さない', true)}
                  {field(s, 'mediaKind', '画像・漫画・動画の指定', '例: 4コマ漫画（画像）')}
                  {field(s, 'product', '関連する製品', '例: メディト')}
                  <label className="block sm:col-span-2">
                    <span className="text-[11px] text-neutral-500">投稿作成ルール</span>
                    <textarea value={s.rules ?? ''} onChange={(e) => update(s.id, { rules: e.target.value })} rows={2} className={`${inputCls} w-full`} placeholder="例: 一次情報の出典URLを必ず入れる" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-[11px] text-neutral-500">禁止表現・注意事項</span>
                    <textarea value={s.ngRules ?? ''} onChange={(e) => update(s.id, { ngRules: e.target.value })} rows={2} className={`${inputCls} w-full`} placeholder="例: 患者情報・効果の断定は書かない" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-[11px] text-neutral-500">タグ（カンマ区切り）</span>
                    <input
                      value={s.tags.join(',')}
                      onChange={(e) => update(s.id, { tags: e.target.value.split(/[,、]/).map((t) => t.replace(/^[#＃]/, '').trim()).filter(Boolean) })}
                      className={`${inputCls} w-full`}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
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
