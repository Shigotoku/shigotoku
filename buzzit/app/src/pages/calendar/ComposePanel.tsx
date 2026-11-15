import { useState } from 'react';
import { scheduleViaApi, type PublishMode } from '../../lib/api';
import { defaultScheduleLocalValue, isFutureLocalDatetime, toDatetimeLocalValue } from '../../lib/datetime';
import { clientPublishModeBlocked } from '../../lib/publishModeSafety';
import { usePersona } from '../../store/personaContext';
import PersonaPublishConfirmModal from '../../components/PersonaPublishConfirmModal';
import { CharCount } from './calendarUtils';

/** SNS ごとの投稿種別（platform キーは文字数制限・媒体判定に使う）と自動投稿モード */
const COMPOSE_TARGETS: Record<string, { platform: string; label: string; native?: PublishMode }> = {
  x: { platform: 'x_thread', label: 'X投稿', native: 'x_free' },
  instagram: { platform: 'instagram', label: 'Instagram', native: 'meta' },
  'facebook-threads': { platform: 'threads', label: 'Threads', native: 'meta' },
  line: { platform: 'line', label: 'LINE', native: 'line' },
  gbp: { platform: 'gbp', label: 'Googleビジネス', native: 'gbp' },
  tiktok: { platform: 'tiktok', label: 'TikTok' },
  'youtube-shorts': { platform: 'youtube_shorts', label: 'YouTube Shorts' },
};

/** 選択日 + おすすめ時刻（今日なら 2 時間後以降の最初の正時）の初期値 */
function initialAt(day: Date | null, hour: number): string {
  const base = day ?? new Date();
  const today = new Date();
  const sameDay = base.toDateString() === today.toDateString();
  if (sameDay) {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    if (d.toDateString() === today.toDateString()) return toDatetimeLocalValue(d);
    return defaultScheduleLocalValue(2);
  }
  const d = new Date(base);
  d.setHours(hour, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

type Props = {
  platformId: string;
  selectedDay: Date | null;
  preferredHour: number;
  /** 保存後に呼ぶ（一覧の再読込・タブ切替など） */
  onSaved: (message: string, at: Date, asDraft: boolean) => void;
};

/** 右パネル「新規作成」: その場で本文を書いて、下書き保存 or 予約する最小フォーム */
export default function ComposePanel({ platformId, selectedDay, preferredHour, onSaved }: Props) {
  const { activePersona } = usePersona();
  const target = COMPOSE_TARGETS[platformId] ?? { platform: platformId, label: platformId };
  const blocked = clientPublishModeBlocked(activePersona, target.native);
  const publishMode: PublishMode = target.native && !blocked ? target.native : 'notify';

  const [text, setText] = useState('');
  const [at, setAt] = useState(() => initialAt(selectedDay, preferredHour));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'schedule' | 'draft' | null>(null);

  // カレンダーで日付を選んだら、日付だけ追従（時刻は維持）。描画中に前回値と比べて更新する
  const dayKey = selectedDay?.toDateString();
  const [prevDayKey, setPrevDayKey] = useState(dayKey);
  if (prevDayKey !== dayKey) {
    setPrevDayKey(dayKey);
    if (selectedDay) {
      const time = at.split('T')[1] ?? `${String(preferredHour).padStart(2, '0')}:00`;
      setAt(`${toDatetimeLocalValue(selectedDay).split('T')[0]}T${time}`);
    }
  }
  const validate = (asDraft: boolean) => {
    setError(null);
    if (!text.trim()) {
      setError('本文を入力してください');
      return false;
    }
    if (!asDraft && !isFutureLocalDatetime(at)) {
      setError('日時が過去です。未来の日時を指定してください');
      return false;
    }
    return true;
  };

  const run = async (asDraft: boolean) => {
    setConfirm(null);
    setBusy(true);
    try {
      const when = isFutureLocalDatetime(at) ? at : defaultScheduleLocalValue(24);
      const date = new Date(asDraft ? when : at);
      const res = await scheduleViaApi({
        contents: [{ platform: target.platform, label: target.label, content: text.trim() }],
        scheduledAt: date.toISOString(),
        publishMode,
        ...(asDraft ? { asDraft: true } : {}),
      });
      setText('');
      onSaved(asDraft ? '下書きに保存しました' : res.message || '予約しました', date, asDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={`${target.label}の本文を入力`}
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <p className="mt-1 text-right text-xs">
          <CharCount platform={target.platform} text={text} />
        </p>
      </div>

      <label className="block text-sm text-neutral-700">
        <span className="mb-1 block text-xs text-neutral-500">投稿日時（カレンダーの日付をクリックでも変更できます）</span>
        <input
          type="datetime-local"
          value={at}
          onChange={(e) => setAt(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </label>

      <p className="text-xs text-neutral-500">
        {publishMode === 'notify'
          ? blocked
            ? `${blocked}予約時刻にお知らせのみ届きます（手動で投稿）。`
            : '予約時刻にお知らせが届きます（手動で投稿）。'
          : '予約時刻に自動で投稿されます。'}
      </p>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => validate(false) && setConfirm('schedule')}
          className="min-h-[40px] flex-1 rounded-lg bg-neutral-900 px-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? '保存中...' : '予約する'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => validate(true) && setConfirm('draft')}
          className="min-h-[40px] rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
        >
          下書き保存
        </button>
      </div>

      <PersonaPublishConfirmModal
        open={confirm != null}
        action={confirm ?? 'schedule'}
        publishMode={publishMode}
        contentLabels={[target.label]}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run(confirm === 'draft')}
      />
    </div>
  );
}
