import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, TrendingUp, Users, DollarSign, Clock, Sun, Sparkles } from 'lucide-react';
import { kpiLabels, mockMetrics, mockMission } from '../data/mockDashboard';
import { fetchDashboard, fetchTrends, fetchScheduledJobs, approveScheduledJob, fetchLineCostEstimate, fetchHpbConversions, type TrendTopic, type ScheduledJob, type LineCostEstimate, type HpbConversion } from '../lib/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(mockMetrics);
  const [mission, setMission] = useState(mockMission);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendTopic[]>([]);
  const [pendingJobs, setPendingJobs] = useState<ScheduledJob[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [lineCost, setLineCost] = useState<LineCostEstimate | null>(null);
  const [hpbConversions, setHpbConversions] = useState<HpbConversion[]>([]);

  useEffect(() => {
    fetchDashboard()
      .then((data) => {
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
        });
        setMission({ ...data.metrics.mission, scriptCount: 3 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetchTrends()
      .then((r) => setTrends(r.trends.slice(0, 3)))
      .catch(() => {});
    fetchScheduledJobs('pending_approval')
      .then((r) => setPendingJobs(r.jobs))
      .catch(() => {});
    fetchLineCostEstimate()
      .then(setLineCost)
      .catch(() => {});
    fetchHpbConversions()
      .then((r) => setHpbConversions(r.conversions))
      .catch(() => {});
  }, []);

  const handleApproveJob = async (jobId: string) => {
    setApprovingId(jobId);
    try {
      await approveScheduledJob(jobId);
      setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      /* ignore */
    }
    setApprovingId(null);
  };

  return (
    <div className="buzz-page">
      {loading && <p className="text-sm text-neutral-500">Firestore から KPI を読み込み中...</p>}

      <div className="border border-neutral-200 bg-white p-6 md:p-7">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          <Sun className="h-3.5 w-3.5" />
          毎朝5分ルーティン
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="border-l-2 border-neutral-900 pl-3">
            <p className="text-xs text-neutral-500">1. 健康診断</p>
            <p className="mt-1 text-lg font-bold">スコア {metrics.healthScore}</p>
          </div>
          <div className="border-l-2 border-neutral-200 pl-3">
            <p className="text-xs text-neutral-500">2. 承認待ち</p>
            <p className="mt-1 text-lg font-bold">{pendingJobs.length} 件</p>
          </div>
          <div className="border-l-2 border-neutral-200 pl-3">
            <p className="text-xs text-neutral-500">3. 今日のトレンド</p>
            <p className="mt-1 text-lg font-bold">{trends.length} 本</p>
          </div>
          <div className="border-l-2 border-neutral-200 pl-3">
            <p className="text-xs text-neutral-500">4. 配信コスト</p>
            <p className="mt-1 text-lg font-bold">
              {lineCost ? `−${lineCost.savedPercent}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="buzz-card lg:col-span-2">
          <div className="border-b border-neutral-200 bg-neutral-50 p-6 md:p-8">
            <p className="buzz-section-label mb-3">Today&apos;s Mission</p>
            <h2 className="text-2xl font-bold md:text-3xl" data-headline-max="28">{mission.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600 md:text-base">
              {mission.description}
            </p>
            <Link to="/magic-creator" className="buzz-btn-primary mt-6">
              内容を確認・承認する
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="buzz-card-pad flex flex-col justify-between">
          <div>
            <h3 className="mb-1 text-lg font-semibold">SNS健康スコア</h3>
            <p className="text-sm text-neutral-500">アカウントの総合的な評価</p>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <span className="buzz-stat-value text-6xl">{metrics.healthScore}</span>
            <div className="flex items-center gap-1 pb-2 text-neutral-700">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+{metrics.healthTrend}%</span>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-500">{kpiLabels.awareness}</span>
              <span className="font-medium">{metrics.reachRating}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">{kpiLabels.conversion}</span>
              <span className="font-medium">{metrics.clickRating}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="buzz-card-pad">
        <div className="mb-8">
          <h2 className="mb-1 text-xl font-bold">売上ファネルトラッキング</h2>
          <p className="text-sm text-neutral-600">投稿 → LINE/LP遷移 → 来店 → 売上の流れを可視化</p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden border border-neutral-200 bg-neutral-200 md:grid-cols-3">
          <div className="bg-white p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-700">
              <Users className="h-5 w-5" />
            </div>
            <div className="mb-1 text-sm text-neutral-500">総リーチ数</div>
            <div className="buzz-stat-value text-2xl">{metrics.reach.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="mb-1 text-sm text-neutral-500">{kpiLabels.leads}</div>
            <div className="buzz-stat-value text-2xl">
              {metrics.lineFriends}{' '}
              <span className="ml-2 text-sm font-normal text-neutral-600">CVR {metrics.lineCvr}%</span>
            </div>
          </div>
          <div className="bg-white p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-700">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="mb-1 text-sm text-neutral-500">{kpiLabels.revenue}</div>
            <div className="buzz-stat-value text-2xl">¥{metrics.estimatedRevenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {pendingJobs.length > 0 && (
        <div className="buzz-card-pad">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-neutral-700" />
            <h2 className="text-lg font-bold">承認待ちの投稿（{pendingJobs.length}件）</h2>
          </div>
          <div className="space-y-3">
            {pendingJobs.map((job) => (
              <div key={job.id} className="border border-neutral-200 bg-neutral-50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {new Date(job.scheduledAt).toLocaleString('ja-JP')} · {job.publishMode}
                  </span>
                  <button
                    type="button"
                    disabled={approvingId === job.id}
                    onClick={() => handleApproveJob(job.id)}
                    className="buzz-btn-primary text-sm px-4 py-2 disabled:opacity-60"
                  >
                    {approvingId === job.id ? '承認中...' : '承認して予約'}
                  </button>
                </div>
                <p className="line-clamp-2 text-sm text-neutral-600">
                  {job.contents.map((c) => c.label).join(' / ')} — {job.contents[0]?.content.slice(0, 120)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hpbConversions.length > 0 && (
        <div className="buzz-card-pad">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-neutral-700" />
            <h2 className="text-lg font-bold">HPB予約に貢献した投稿</h2>
            <span className="ml-auto text-xs text-neutral-500">Growth OS</span>
          </div>
          <div className="space-y-2">
            {hpbConversions.slice(0, 3).map((c) => (
              <div
                key={c.postId}
                className="flex items-center justify-between border border-neutral-200 bg-neutral-50 p-3 text-sm"
              >
                <div className="flex-1">
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-neutral-500">HPB予約 {c.reservations} 件</p>
                </div>
                <p className="buzz-stat-value text-sm">¥{c.estimatedRevenue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {trends.length > 0 && (
        <div className="buzz-card-pad">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">今週のトレンドネタ</h2>
            <Link to="/analytics" className="text-sm text-neutral-600 hover:text-neutral-900">
              すべて見る →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {trends.map((t) => (
              <Link
                key={t.id}
                to={`/magic-creator?idea=${encodeURIComponent(`${t.topic} — ${t.hook}`)}`}
                className="border border-neutral-200 bg-neutral-50 p-4 transition-colors hover:border-neutral-400 hover:bg-white"
              >
                <p className="text-sm font-medium">{t.topic}</p>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{t.hook}</p>
                <p className="mt-2 text-xs text-neutral-600">スコア {t.score}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
