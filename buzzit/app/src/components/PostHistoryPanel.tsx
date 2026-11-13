import { useEffect, useMemo, useState } from 'react';
import { Eye, ExternalLink, X } from 'lucide-react';
import { fetchInsightsPosts, type PostInsight, type ScheduledJob } from '../lib/api';

const INSIGHT_PLATFORMS = new Set(['x', 'instagram', 'facebook-threads']);

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

/**
 * これまでに投稿した内容の一覧。行を押すと全文とインプレッション等が見られる。
 * 日付で絞り込み（カレンダーの日付クリック連動）にも対応。
 */
export default function PostHistoryPanel({
  jobs,
  platformId,
  day,
  onClearDay,
}: {
  jobs: ScheduledJob[];
  platformId?: string;
  day: Date | null;
  onClearDay: () => void;
}) {
  const [insights, setInsights] = useState<Record<string, PostInsight>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const key = platformId === 'facebook-threads' ? undefined : platformId;
    if (platformId && !INSIGHT_PLATFORMS.has(platformId)) {
      setInsights({});
      return;
    }
    fetchInsightsPosts({ platform: key, limit: 100 })
      .then((r) => setInsights(Object.fromEntries(r.posts.map((p) => [p.jobId, p]))))
      .catch(() => setInsights({}));
  }, [platformId]);

  const posted = useMemo(
    () =>
      jobs
        .filter((j) => j.status === 'published' || j.status === 'notified')
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [jobs],
  );

  const list = day
    ? posted.filter((j) => new Date(j.scheduledAt).toDateString() === day.toDateString())
    : posted;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          投稿履歴 <span className="font-normal text-neutral-500">（{list.length}件）</span>
        </h3>
        {day && (
          <button
            type="button"
            onClick={onClearDay}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-100"
          >
            {dayLabel(day.toISOString())} のみ
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {list.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-500">
          {day ? 'この日の投稿履歴はありません。' : 'まだ投稿履歴がありません。'}
        </p>
      )}

      <ul className="space-y-1.5">
        {list.map((job) => {
          const ins = insights[job.id];
          const open = openId === job.id;
          const body = job.contents.map((c) => c.content).join('\n\n---\n\n');
          return (
            <li key={job.id} className="rounded-lg border border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : job.id)}
                className="flex w-full items-start gap-2 p-2 text-left"
              >
                <span className="w-14 shrink-0 text-[11px] leading-tight text-neutral-500">
                  {dayLabel(job.scheduledAt)}
                  <br />
                  {new Date(job.scheduledAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`min-w-0 flex-1 text-xs text-neutral-800 ${open ? '' : 'line-clamp-2'}`}>
                  {open ? '' : (job.contents[0]?.content ?? '')}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-neutral-700">
                  <Eye className="h-3 w-3" />
                  {ins ? ins.impressions.toLocaleString() : '—'}
                </span>
              </button>
              {open && (
                <div className="space-y-2 border-t border-neutral-100 p-2 text-xs">
                  {job.tags && job.tags.length > 0 && (
                    <p className="flex flex-wrap gap-1">
                      {job.tags.map((t) => (
                        <span key={t} className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-800">#{t}</span>
                      ))}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-neutral-800">{body}</p>
                  {job.mediaUrls?.[0] && (
                    <img src={job.mediaUrls[0]} alt="" className="max-h-40 rounded border border-neutral-200" />
                  )}
                  {ins ? (
                    <p className="flex flex-wrap gap-x-3 gap-y-1 text-neutral-600">
                      <span>表示 {ins.impressions.toLocaleString()}</span>
                      {ins.reach != null && <span>リーチ {ins.reach.toLocaleString()}</span>}
                      {ins.likes != null && <span>いいね {ins.likes}</span>}
                      {ins.replies != null && <span>返信 {ins.replies}</span>}
                      {ins.reposts != null && <span>リポスト {ins.reposts}</span>}
                    </p>
                  ) : (
                    <p className="text-neutral-400">インプレッション未取得（同期後に表示されます）</p>
                  )}
                  {ins?.source === 'x' && ins.externalId && (
                    <a
                      href={`https://x.com/i/status/${ins.externalId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-violet-700 underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Xで開く
                    </a>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
