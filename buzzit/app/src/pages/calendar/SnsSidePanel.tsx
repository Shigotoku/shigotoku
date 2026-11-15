import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Inbox, PenLine, RefreshCw, Wand2, X } from 'lucide-react';
import type { ScheduledJob } from '../../lib/api';
import PostHistoryPanel from '../../components/PostHistoryPanel';
import { getPostTemplates } from '../../data/postTemplates';
import ComposePanel from './ComposePanel';
import JobCard, { type JobCardHandlers } from './JobCard';

export type SideTab = 'create' | 'ideas' | 'history' | 'schedule' | 'draft';

type Props = JobCardHandlers & {
  platformId: string;
  snsName: string;
  tab: SideTab;
  setTab: (t: SideTab) => void;
  scopedJobs: ScheduledJob[];
  selectedDay: Date | null;
  dayOnly: boolean;
  setDayOnly: (v: boolean) => void;
  preferredHour: number;
  loading: boolean;
  load: () => void;
  onSaved: (message: string, at: Date, asDraft: boolean) => void;
};

function Empty({ title, description, onCreate }: { title: string; description: string; onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-neutral-800">{title}</p>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
      <button type="button" onClick={onCreate} className="mt-3 min-h-[36px] rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white">
        新規作成へ
      </button>
    </div>
  );
}

const sameYmd = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** SNS ハブの右パネル。上のボタンで下の領域を切り替える（新規作成 / ネタから作る / 投稿履歴 / 投稿予定 / 下書き） */
export default function SnsSidePanel(props: Props) {
  const { platformId, snsName, tab, setTab, scopedJobs, selectedDay, dayOnly, setDayOnly, preferredHour, loading, load, onSaved, ...card } = props;
  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const [historyByDay, setHistoryByDay] = useState(false);

  const scheduled = useMemo(
    () =>
      scopedJobs
        .filter((j) => j.status === 'pending' || j.status === 'pending_approval' || j.status === 'processing' || j.status === 'failed')
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [scopedJobs],
  );
  const drafts = useMemo(
    () =>
      scopedJobs
        .filter((j) => j.status === 'draft')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [scopedJobs],
  );
  const scheduledShown = dayOnly && selectedDay ? scheduled.filter((j) => sameYmd(new Date(j.scheduledAt), selectedDay)) : scheduled;
  const failedCount = scheduled.filter((j) => j.status === 'failed').length;
  const templates = useMemo(() => getPostTemplates().slice(0, 5), []);

  const tabs: Array<{ key: SideTab; label: string; count?: number }> = [
    { key: 'create', label: '新規作成' },
    { key: 'ideas', label: 'ネタから作る' },
    { key: 'history', label: '投稿履歴' },
    { key: 'schedule', label: '投稿予定', count: scheduled.length },
    { key: 'draft', label: '下書き', count: drafts.length },
  ];

  const goCreator = () => {
    const q = new URLSearchParams({ sns: platformId });
    if (idea.trim()) q.set('idea', idea.trim());
    navigate(`/magic-creator?${q.toString()}`);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-neutral-200/80 bg-white p-3 shadow-sm">
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${
              tab === t.key
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  tab === t.key ? 'bg-white/20' : t.key === 'schedule' && failedCount > 0 ? 'bg-red-100 text-red-700' : 'bg-neutral-100'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {tab === 'create' && (
          <ComposePanel platformId={platformId} selectedDay={selectedDay} preferredHour={preferredHour} onSaved={onSaved} />
        )}

        {tab === 'ideas' && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">ネタ（一言メモでもOK）から、{snsName}向けの投稿をAIが作ります。</p>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={5}
              placeholder="例: 新メニューの紹介、今週のお知らせ"
              className="w-full resize-y rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={goCreator}
              className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              <Wand2 className="h-4 w-4" />
              この内容で作る
            </button>
            {templates.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-neutral-500">ネタのヒント</p>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setIdea(t.idea)}
                      className="max-w-full truncate rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-700 hover:border-neutral-900"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3 border-t border-neutral-100 pt-3 text-sm">
              <Link to="/inbox" className="inline-flex items-center gap-1 text-neutral-700 underline-offset-2 hover:underline">
                <Inbox className="h-4 w-4" />
                溜めたネタから選ぶ
              </Link>
              <Link to="/candidates" className="inline-flex items-center gap-1 text-neutral-700 underline-offset-2 hover:underline">
                <PenLine className="h-4 w-4" />
                投稿候補を見る
              </Link>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <>
            <label className="flex items-center gap-2 text-xs text-neutral-600">
              <input type="checkbox" checked={historyByDay} onChange={(e) => setHistoryByDay(e.target.checked)} />
              カレンダーで選んだ日だけ表示
              {selectedDay && historyByDay && (
                <span className="text-neutral-500">
                  （{selectedDay.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}）
                </span>
              )}
            </label>
            <PostHistoryPanel
              jobs={scopedJobs}
              platformId={platformId}
              day={historyByDay ? selectedDay : null}
              onClearDay={() => setHistoryByDay(false)}
              onClone={card.setCloneJob}
              onRetry={card.handleRetry}
              busyId={card.busyId}
            />
          </>
        )}

        {tab === 'schedule' && (
          <>
            <div className="flex items-center justify-between gap-2">
              {selectedDay ? (
                <button
                  type="button"
                  onClick={() => setDayOnly(!dayOnly)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                    dayOnly ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700'
                  }`}
                >
                  {selectedDay.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}だけ
                  {dayOnly && <X className="h-3 w-3" />}
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={load} className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900">
                <RefreshCw className="h-3.5 w-3.5" />
                更新
              </button>
            </div>
            {loading && <p className="text-sm text-neutral-500">読み込み中...</p>}
            {!loading && scheduledShown.length === 0 && (
              <Empty title={dayOnly ? 'この日の予定はありません' : '投稿予定はありません'} description="「新規作成」から書くか、下書きをカレンダーの日付へドラッグして予約できます。" onCreate={() => setTab('create')} />
            )}
            {scheduledShown.map((j) => (
              <JobCard key={j.id} job={j} showDate={!dayOnly} {...card} />
            ))}
          </>
        )}

        {tab === 'draft' && (
          <>
            <p className="text-xs text-neutral-500">カレンダーの日付へドラッグすると予約になります。</p>
            {loading && <p className="text-sm text-neutral-500">読み込み中...</p>}
            {!loading && drafts.length === 0 && (
              <Empty title="下書きはありません" description="「新規作成」で「下書き保存」するか、ネタから作った投稿を下書き保存できます。" onCreate={() => setTab('create')} />
            )}
            {drafts.map((j) => (
              <JobCard key={j.id} job={j} showDate {...card} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
