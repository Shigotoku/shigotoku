import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  fetchDashboard,
  fetchScheduledJobs,
  approveScheduledJob,
  fetchInsightsSummary,
  fetchTrends,
  type TrendTopic,
  type ScheduledJob,
  type InsightsSummary,
} from '../lib/api';
import { mockMetrics } from '../data/mockDashboard';
import DemoDataBanner from '../components/DemoDataBanner';
import { useSetupSignals } from '../hooks/useSetupSignals';
import PersonaPublishConfirmModal from '../components/PersonaPublishConfirmModal';
import DualApprovalSetupBanner from '../components/DualApprovalSetupBanner';
import { usePersona } from '../store/personaContext';
import { SNS_NAV_PLATFORMS, detectJobPlatformId, getSnsNavPlatform } from '../lib/snsPlatforms';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function jobColor(job: ScheduledJob) {
  const id = detectJobPlatformId(job);
  return (id && getSnsNavPlatform(id)?.brandColor) || '#7c3aed';
}

function jobPlatformName(job: ScheduledJob) {
  const id = detectJobPlatformId(job);
  return (id && getSnsNavPlatform(id)?.name) || 'その他';
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-500">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { isSample } = useSetupSignals();
  const { activePersonaId, activePersona } = usePersona();
  const [metrics, setMetrics] = useState(mockMetrics);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [trends, setTrends] = useState<TrendTopic[]>([]);
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveConfirmJob, setApproveConfirmJob] = useState<ScheduledJob | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadJobs = () => {
    if (!activePersonaId) return;
    fetchScheduledJobs(undefined, activePersonaId)
      .then((r) => setJobs(r.jobs))
      .catch(() => setJobs([]));
  };

  useEffect(() => {
    fetchInsightsSummary().then((r) => setInsights(r.summary)).catch(() => setInsights(null));
    fetchDashboard()
      .then((data) =>
        setMetrics({
          ...mockMetrics,
          healthScore: data.metrics.healthScore,
          healthTrend: data.metrics.healthTrend,
          reachRating: data.metrics.reachRating,
          clickRating: data.metrics.clickRating,
          reach: data.metrics.funnel.reach,
          lineFriends: data.metrics.funnel.lineSignups,
          estimatedRevenue: data.metrics.funnel.revenue,
          lineCvr:
            data.metrics.funnel.reach > 0
              ? Math.round((data.metrics.funnel.lineSignups / data.metrics.funnel.reach) * 1000) / 10
              : mockMetrics.lineCvr,
        }),
      )
      .catch(() => {});
    fetchTrends().then((r) => setTrends(r.trends.slice(0, 3))).catch(() => {});
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePersonaId]);

  useEffect(() => {
    window.addEventListener('buzzit-persona-changed', loadJobs);
    return () => window.removeEventListener('buzzit-persona-changed', loadJobs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePersonaId]);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, ScheduledJob[]>();
    for (const j of jobs) {
      const k = dayKey(new Date(j.scheduledAt));
      map.set(k, [...(map.get(k) ?? []), j]);
    }
    return map;
  }, [jobs]);

  const pending = jobs.filter((j) => j.status === 'pending_approval');
  const failedCount = jobs.filter((j) => j.status === 'failed').length;
  const upcoming = jobs.filter((j) => ['pending', 'pending_approval', 'processing'].includes(j.status)).length;

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const selectedJobs = (jobsByDay.get(dayKey(selected)) ?? []).sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  const todayKey = dayKey(new Date());

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setMessage(null);
    try {
      const res = await approveScheduledJob(id);
      setMessage(res.message ?? (res.needsSecondApproval ? '1人目を承認しました。2人目の承認が必要です。' : '承認しました。'));
      loadJobs();
    } catch {
      setMessage('承認に失敗しました。別キャラの予約の可能性があります。');
    }
    setApprovingId(null);
    setApproveConfirmJob(null);
  };

  const byPlatform = insights ? Object.entries(insights.byPlatform) : [];

  return (
    <div className="buzz-page">
      <DemoDataBanner isSample={isSample} />

      {failedCount > 0 && (
        <Link
          to="/calendar"
          className="flex items-center gap-3 rounded-xl border border-red-200/80 bg-red-50/80 p-4 text-sm text-red-900 hover:border-red-300"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>投稿失敗が {failedCount} 件あります。カレンダーから再試行してください。</span>
          <ArrowRight className="ml-auto h-4 w-4" />
        </Link>
      )}

      <DualApprovalSetupBanner compact />
      {message && <p className="buzz-alert buzz-alert-info text-sm">{message}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* 左: 投稿予定カレンダー */}
        <section className="buzz-card-pad space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="buzz-section-label">投稿予定カレンダー</p>
              <p className="mt-0.5 text-xs text-neutral-500">表示中: {activePersona?.name ?? '—'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="前の月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg p-2 hover:bg-neutral-100">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[96px] text-center text-sm font-semibold">
                {month.getFullYear()}年{month.getMonth() + 1}月
              </span>
              <button type="button" aria-label="次の月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg p-2 hover:bg-neutral-100">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 text-xs">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`bg-neutral-50 py-1.5 text-center font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-neutral-500'}`}>
                {w}
              </div>
            ))}
            {cells.map((d) => {
              const k = dayKey(d);
              const list = jobsByDay.get(k) ?? [];
              const inMonth = d.getMonth() === month.getMonth();
              const isSel = k === dayKey(selected);
              return (
                <button
                  key={k + d.getTime()}
                  type="button"
                  onClick={() => setSelected(d)}
                  className={`flex min-h-[64px] flex-col items-start gap-1 bg-white p-1.5 text-left transition-colors hover:bg-violet-50/60 ${inMonth ? '' : 'opacity-40'} ${isSel ? 'ring-2 ring-inset ring-violet-500' : ''}`}
                >
                  <span className={`text-xs ${k === todayKey ? 'rounded-full bg-violet-600 px-1.5 font-bold text-white' : 'text-neutral-700'}`}>
                    {d.getDate()}
                  </span>
                  <span className="flex flex-wrap gap-0.5">
                    {list.slice(0, 6).map((j) => (
                      <span key={j.id} className="h-2 w-2 rounded-full" style={{ backgroundColor: jobColor(j), opacity: j.status === 'draft' ? 0.4 : 1 }} />
                    ))}
                  </span>
                  {list.length > 6 && <span className="text-[10px] text-neutral-500">+{list.length - 6}</span>}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-600">
            {SNS_NAV_PLATFORMS.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.brandColor }} />
                {p.name}
              </span>
            ))}
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {selected.getMonth() + 1}月{selected.getDate()}日の予定（{selectedJobs.length}件）
            </p>
            {selectedJobs.length === 0 ? (
              <p className="mt-2 text-xs text-neutral-500">この日の投稿予定はありません。</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {selectedJobs.map((j) => (
                  <li key={j.id} className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: jobColor(j) }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-neutral-500">
                        {new Date(j.scheduledAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} · {jobPlatformName(j)} · {j.status === 'pending_approval' ? '承認待ち' : j.status === 'published' || j.status === 'notified' ? '投稿済み' : j.status === 'failed' ? '失敗' : j.status === 'draft' ? '下書き' : '予約済み'}
                      </p>
                      <p className="line-clamp-2 text-neutral-800">{j.contents[0]?.content.slice(0, 100)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 右: 現状の数字 */}
        <div className="space-y-6 lg:col-span-2">
          <section className="buzz-card-pad">
            <div className="flex items-center justify-between">
              <p className="buzz-section-label">インプレッション</p>
              <Link to="/analytics" className="text-xs underline-offset-2 hover:underline">詳しく →</Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="合計表示（インプレッション）" value={insights ? insights.totalImpressions.toLocaleString() : '—'} />
              <Stat label="リーチ" value={insights ? insights.totalReach.toLocaleString() : '—'} />
              <Stat label="計測した投稿" value={insights ? `${insights.postCount}件` : '—'} />
              <Stat label="今後の予定" value={`${upcoming}件`} />
            </div>
            {byPlatform.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {byPlatform.map(([name, v]) => (
                  <li key={name} className="flex justify-between border-b border-neutral-100 pb-1.5">
                    <span className="text-neutral-600">{name}</span>
                    <span className="font-medium tabular-nums">{v.impressions.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-neutral-500">
              {insights?.lastSyncedAt
                ? `最終同期 ${new Date(insights.lastSyncedAt).toLocaleString('ja-JP')}`
                : '未同期 — 投稿後に自動取得されます。'}
              {insights && !insights.insightsEnabled && ' インサイト同期がオフです（設定から有効化）。'}
            </p>
          </section>

          <section className="buzz-card-pad">
            <p className="buzz-section-label">成果</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="SNS健康スコア" value={String(metrics.healthScore)} sub={`${metrics.healthTrend >= 0 ? '+' : ''}${metrics.healthTrend}%`} />
              <Stat label="総リーチ" value={metrics.reach.toLocaleString()} />
              <Stat label="LINE友だち" value={String(metrics.lineFriends)} sub={`CVR ${metrics.lineCvr}%`} />
              <Stat label="推定売上" value={`¥${metrics.estimatedRevenue.toLocaleString()}`} />
            </div>
          </section>

          <section className="buzz-card-pad">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-neutral-700" />
              <p className="buzz-section-label">承認待ち（{pending.length}件）</p>
            </div>
            {pending.length === 0 ? (
              <p className="text-xs text-neutral-500">承認待ちの投稿はありません。</p>
            ) : (
              <ul className="space-y-2">
                {pending.slice(0, 5).map((job) => (
                  <li key={job.id} className="rounded-lg border-l-4 border-violet-500 bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">
                      {new Date(job.scheduledAt).toLocaleString('ja-JP')} · {jobPlatformName(job)}
                      {job.dualApprovalRequired ? (job.firstApprovedBy ? ' · 2人目の承認待ち' : ' · 2人承認が必要') : ''}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-800">{job.contents[0]?.content.slice(0, 100)}</p>
                    <button
                      type="button"
                      disabled={approvingId === job.id}
                      onClick={() => setApproveConfirmJob(job)}
                      className="buzz-btn-accent mt-2 !px-3 !py-1.5 text-xs disabled:opacity-60"
                    >
                      {approvingId === job.id ? '承認中...' : job.firstApprovedBy ? '2人目を承認' : '承認して予約'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {trends.length > 0 && (
            <section className="buzz-card-pad">
              <p className="buzz-section-label">今週のトレンドネタ</p>
              <ul className="mt-3 space-y-2">
                {trends.map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/magic-creator?idea=${encodeURIComponent(t.topic)}`}
                      className="block rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm hover:border-violet-300"
                    >
                      <p className="font-medium text-neutral-900">{t.topic}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{t.hook}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-neutral-500">
            使い方や初期設定は <Link to="/guide" className="underline-offset-2 hover:underline">使い方の手順</Link> にまとめています。
          </p>
        </div>
      </div>

      <PersonaPublishConfirmModal
        open={!!approveConfirmJob}
        action="approve"
        publishMode={approveConfirmJob?.publishMode}
        contentLabels={approveConfirmJob?.contents.map((c) => c.label) ?? []}
        onCancel={() => setApproveConfirmJob(null)}
        onConfirm={() => approveConfirmJob && void handleApprove(approveConfirmJob.id)}
      />
    </div>
  );
}
