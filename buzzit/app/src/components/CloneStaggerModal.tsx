import { useEffect, useMemo, useState } from 'react';
import { CopyPlus, X } from 'lucide-react';
import { scheduleViaApi, type PublishMode, type ScheduledJob } from '../lib/api';
import { CLONE_TARGETS, buildCloneStaggerPlan } from '../lib/bulkSchedule';
import { defaultScheduleLocalValue, isFutureLocalDatetime, toDatetimeLocalValue } from '../lib/datetime';

type Props = {
  job: ScheduledJob | null;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
  connected?: { x?: boolean; meta?: boolean; line?: boolean };
};

export default function CloneStaggerModal({ job, open, onClose, onDone, connected }: Props) {
  const source = job?.contents[0];
  const [pattern, setPattern] = useState<'same' | 'stagger_hours' | 'stagger_days'>('stagger_days');
  const [baseAt, setBaseAt] = useState(() => defaultScheduleLocalValue(24));
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !job || !source) return;
    setBaseAt(toDatetimeLocalValue(new Date(Math.max(Date.now() + 3600_000, new Date(job.scheduledAt).getTime()))));
    setPattern('stagger_days');
    setError(null);
    const init: Record<string, boolean> = {};
    for (const t of CLONE_TARGETS) {
      init[t.platform] = t.platform !== source.platform;
    }
    setSelected(init);
  }, [open, job, source]);

  const rows = useMemo(() => {
    if (!source) return [];
    const targets = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    return buildCloneStaggerPlan({
      sourceContent: source.content,
      sourcePlatform: source.platform,
      baseLocalAt: baseAt,
      pattern,
      hourStep: 3,
      dayStep: 1,
      targetPlatforms: targets,
      defaultPublishMode: (job?.publishMode as PublishMode) ?? 'notify',
      connected,
    });
  }, [source, selected, baseAt, pattern, job?.publishMode, connected]);

  if (!open || !job || !source) return null;

  const submit = async () => {
    setError(null);
    const active = rows.filter((r) => r.enabled);
    if (active.length === 0) {
      setError('複製先の媒体を選んでください');
      return;
    }
    for (const r of active) {
      if (!isFutureLocalDatetime(r.localAt)) {
        setError(`${r.label} の日時が過去です`);
        return;
      }
    }
    setBusy(true);
    try {
      for (const r of active) {
        await scheduleViaApi({
          contents: [
            {
              platform: r.platform,
              label: r.label,
              content: r.content,
              carouselSlides: r.carouselSlides,
            },
          ],
          scheduledAt: new Date(r.localAt).toISOString(),
          publishMode: r.publishMode,
          mediaUrls: job.mediaUrls?.length ? job.mediaUrls : undefined,
        });
      }
      const mediaNote = job.mediaUrls?.length ? `（写真・素材 ${job.mediaUrls.length}件も引き継ぎ）` : '';
      onDone(`${active.length}媒体へずらして複製予約しました${mediaNote}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '複製に失敗しました');
    }
    setBusy(false);
  };

  return (
    <div className="buzz-modal-overlay" onClick={() => !busy && onClose()}>
      <div
        className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <CopyPlus className="h-5 w-5" />
            <h3 className="text-lg font-bold">他SNSへずらして複製</h3>
          </div>
          <button type="button" disabled={busy} onClick={onClose} className="p-1 text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-sm text-neutral-600">
            「{source.label}」の内容を他媒体向けに少し整えて、日時をずらして予約します。
            {job.mediaUrls && job.mediaUrls.length > 0
              ? ` 添付素材 ${job.mediaUrls.length}件も各予約に引き継ぎます。`
              : ''}
          </p>
          {job.mediaUrls && job.mediaUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {job.mediaUrls.slice(0, 4).map((url) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-14 w-14 border border-neutral-200 object-cover"
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['same', '同時'],
                ['stagger_hours', '時間ずらし'],
                ['stagger_days', '日ずらし'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPattern(id)}
                className={`border px-3 py-1.5 text-xs ${
                  pattern === id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-600">基準日時</label>
            <input
              type="datetime-local"
              value={baseAt}
              min={toDatetimeLocalValue(new Date())}
              onChange={(e) => setBaseAt(e.target.value)}
              className="w-full border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            {CLONE_TARGETS.filter((t) => t.platform !== source.platform).map((t) => (
              <label key={t.platform} className="flex items-center gap-2 border border-neutral-200 bg-neutral-50 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={!!selected[t.platform]}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [t.platform]: e.target.checked }))}
                  className="accent-neutral-900"
                />
                <span className="flex-1 font-medium">{t.label}</span>
                {rows.find((r) => r.platform === t.platform)?.localAt && selected[t.platform] && (
                  <span className="text-[10px] text-neutral-500">
                    {new Date(rows.find((r) => r.platform === t.platform)!.localAt).toLocaleString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="border-t border-neutral-200 px-5 py-4">
          <button type="button" disabled={busy} onClick={submit} className="buzz-btn-primary w-full disabled:opacity-70">
            {busy ? '予約中...' : `${rows.filter((r) => r.enabled).length}件を複製予約`}
          </button>
        </div>
      </div>
    </div>
  );
}
