import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Layers, X } from 'lucide-react';
import {
  fetchScheduledJobs,
  scheduleViaApi,
  type PublishMode,
} from '../lib/api';
import {
  PATTERN_OPTIONS,
  buildBulkScheduleRows,
  suggestedBaseLocalAt,
  type ScheduleContentItem,
  type SchedulePattern,
} from '../lib/bulkSchedule';
import { defaultScheduleLocalValue, isFutureLocalDatetime, toDatetimeLocalValue } from '../lib/datetime';
import {
  loadBulkPatternPref,
  loadBulkSplitPref,
  saveBulkPatternPref,
  saveBulkSplitPref,
} from '../lib/schedulePrefs';

type Props = {
  open: boolean;
  onClose: () => void;
  contents: ScheduleContentItem[];
  mediaUrls?: string[];
  defaultPublishMode?: PublishMode;
  connected?: { x?: boolean; meta?: boolean; line?: boolean };
  onDone: (message: string) => void;
};

export default function BulkScheduleModal({
  open,
  onClose,
  contents,
  mediaUrls,
  defaultPublishMode = 'notify',
  connected,
  onDone,
}: Props) {
  const [pattern, setPattern] = useState<SchedulePattern>('same');
  const [baseAt, setBaseAt] = useState(() => defaultScheduleLocalValue(2));
  const [hourStep, setHourStep] = useState(2);
  const [dayStep, setDayStep] = useState(1);
  const [splitJobs, setSplitJobs] = useState(true);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [customTimes, setCustomTimes] = useState<Record<string, string>>({});
  const [publishMode, setPublishMode] = useState<PublishMode>(defaultPublishMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPublishMode(defaultPublishMode);
    const savedPattern = loadBulkPatternPref();
    setPattern(savedPattern);
    setSplitJobs(loadBulkSplitPref(contents.length > 1));
    const init: Record<string, boolean> = {};
    for (const c of contents) init[c.platform] = true;
    setEnabled(init);

    let cancelled = false;
    fetchScheduledJobs()
      .then((r) => {
        if (cancelled) return;
        const base = suggestedBaseLocalAt(r.jobs);
        setBaseAt(base);
        const times: Record<string, string> = {};
        for (const c of contents) times[c.platform] = base;
        setCustomTimes(times);
      })
      .catch(() => {
        if (cancelled) return;
        const base = defaultScheduleLocalValue(2);
        setBaseAt(base);
        const times: Record<string, string> = {};
        for (const c of contents) times[c.platform] = base;
        setCustomTimes(times);
      });
    return () => {
      cancelled = true;
    };
  }, [open, contents, defaultPublishMode]);

  const rows = useMemo(() => {
    const enabledSet = new Set(
      Object.entries(enabled)
        .filter(([, v]) => v)
        .map(([k]) => k),
    );
    return buildBulkScheduleRows({
      contents,
      pattern,
      baseLocalAt: baseAt,
      hourStep,
      dayStep,
      customTimes,
      defaultPublishMode: publishMode,
      connected,
      enabledPlatforms: enabledSet,
    });
  }, [contents, pattern, baseAt, hourStep, dayStep, customTimes, publishMode, connected, enabled]);

  const activeRows = rows.filter((r) => r.enabled);

  const submit = async () => {
    setError(null);
    if (activeRows.length === 0) {
      setError('予約する媒体を1つ以上選んでください');
      return;
    }
    for (const r of activeRows) {
      if (!isFutureLocalDatetime(r.localAt)) {
        setError(`${r.label} の日時が過去です。未来の日時を指定してください。`);
        return;
      }
    }

    setBusy(true);
    try {
      if (!splitJobs && pattern === 'same') {
        // 1ジョブに全媒体（同時のみ）
        const result = await scheduleViaApi({
          contents: activeRows.map((r) => ({
            platform: r.platform,
            label: r.label,
            content: r.content,
            carouselSlides: r.carouselSlides,
          })),
          scheduledAt: new Date(activeRows[0].localAt).toISOString(),
          publishMode,
          mediaUrls,
        });
        onDone(result.message);
        onClose();
        return;
      }

      // 媒体ごとにジョブ分割（ずらし・カスタム・同時でも分割可）
      const messages: string[] = [];
      for (const r of activeRows) {
        const result = await scheduleViaApi({
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
          mediaUrls,
        });
        messages.push(`${r.label}: ${new Date(r.localAt).toLocaleString('ja-JP')}`);
        void result;
      }
      onDone(`${activeRows.length}媒体を予約しました（${PATTERN_OPTIONS.find((p) => p.id === pattern)?.title}）\n${messages.join(' / ')}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約に失敗しました');
    }
    setBusy(false);
  };

  const saveDrafts = async () => {
    setError(null);
    if (activeRows.length === 0) {
      setError('媒体を1つ以上選んでください');
      return;
    }
    setBusy(true);
    try {
      for (const r of activeRows) {
        const at = isFutureLocalDatetime(r.localAt) ? r.localAt : defaultScheduleLocalValue(24);
        await scheduleViaApi({
          contents: [
            {
              platform: r.platform,
              label: r.label,
              content: r.content,
              carouselSlides: r.carouselSlides,
            },
          ],
          scheduledAt: new Date(at).toISOString(),
          publishMode: r.publishMode,
          mediaUrls,
          asDraft: true,
        });
      }
      onDone(`${activeRows.length}件を下書き保存しました。カレンダーへドラッグして日時を決められます。`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '下書き保存に失敗しました');
    }
    setBusy(false);
  };

  if (!open) return null;

  return (
    <div
      className="buzz-modal-overlay"
      onClick={() => !busy && onClose()}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-neutral-700" />
            <h3 className="text-lg font-bold">かんたん一括予約</h3>
          </div>
          <button type="button" disabled={busy} onClick={onClose} className="p-1 text-neutral-600 hover:text-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-sm text-neutral-600">
            同じネタを各SNSへ同時予約したり、時間・日をずらしてバラエティ豊かに置けます。
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {PATTERN_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPattern(p.id);
                  saveBulkPatternPref(p.id);
                  if (p.id !== 'same') {
                    setSplitJobs(true);
                    saveBulkSplitPref(true);
                  }
                }}
                className={`border p-3 text-left transition-colors ${
                  pattern === p.id
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white hover:border-neutral-400'
                }`}
              >
                <p className="text-sm font-semibold">{p.title}</p>
                <p className={`mt-0.5 text-[11px] ${pattern === p.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  {p.detail}
                </p>
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
              className="w-full border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {pattern === 'stagger_hours' && (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-neutral-600">媒体ごとの間隔（時間）</span>
              <input
                type="number"
                min={1}
                max={24}
                value={hourStep}
                onChange={(e) => setHourStep(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 border border-neutral-200 px-2 py-1.5 text-sm"
              />
            </label>
          )}

          {pattern === 'stagger_days' && (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-neutral-600">媒体ごとの間隔（日）</span>
              <input
                type="number"
                min={1}
                max={14}
                value={dayStep}
                onChange={(e) => setDayStep(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 border border-neutral-200 px-2 py-1.5 text-sm"
              />
            </label>
          )}

          <div>
            <label className="mb-1 block text-xs text-neutral-600">デフォルト投稿モード</label>
            <select
              value={publishMode}
              onChange={(e) => setPublishMode(e.target.value as PublishMode)}
              className="w-full border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <option value="notify">通知リマインダー</option>
              <option value="approval">承認後投稿</option>
              <option value="x_free">X API 自動投稿</option>
              <option value="meta">Meta 自動投稿</option>
              <option value="line">LINE ブロードキャスト</option>
              <option value="auto">自動</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={splitJobs}
              onChange={(e) => {
                setSplitJobs(e.target.checked);
                saveBulkSplitPref(e.target.checked);
              }}
              className="mt-0.5 accent-neutral-900"
              disabled={pattern !== 'same'}
            />
            <span>
              <span className="font-medium">媒体ごとにジョブを分ける</span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                ずらし予約では必須。同時でも分けるとカレンダー上で媒体別管理しやすくなります。
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
              <Layers className="h-3.5 w-3.5" />
              プレビュー（{activeRows.length}媒体）
            </p>
            {rows.map((r) => (
              <div key={r.platform} className="border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!enabled[r.platform]}
                    onChange={(e) => setEnabled((prev) => ({ ...prev, [r.platform]: e.target.checked }))}
                    className="accent-neutral-900"
                  />
                  <span className="min-w-0 flex-1 text-sm font-medium">{r.label}</span>
                  <span className="text-[10px] text-neutral-500">{r.publishMode}</span>
                </div>
                {(pattern === 'custom' || enabled[r.platform]) && (
                  <input
                    type="datetime-local"
                    value={pattern === 'custom' ? (customTimes[r.platform] ?? r.localAt) : r.localAt}
                    min={toDatetimeLocalValue(new Date())}
                    disabled={pattern !== 'custom'}
                    onChange={(e) =>
                      setCustomTimes((prev) => ({ ...prev, [r.platform]: e.target.value }))
                    }
                    className="mt-2 w-full border border-neutral-200 bg-white px-2 py-1.5 text-xs disabled:bg-neutral-100"
                  />
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="shrink-0 space-y-2 border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="buzz-btn-primary w-full disabled:opacity-70"
          >
            {busy ? '予約中...' : `${activeRows.length}媒体を予約する`}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={saveDrafts}
            className="w-full border border-neutral-300 py-2.5 text-sm disabled:opacity-70"
          >
            下書きにしてカレンダーでドラッグ配置
          </button>
        </div>
      </div>
    </div>
  );
}
