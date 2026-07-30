import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Sun,
  Sparkles,
  Wand2,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { kpiLabels, mockMetrics, mockMission } from '../data/mockDashboard';
import {
  fetchDashboard,
  fetchTrends,
  fetchScheduledJobs,
  approveScheduledJob,
  fetchLineCostEstimate,
  fetchHpbConversions,
  useTrend,
  fetchConnectionHealth,
  fetchRegionalWatch,
  fetchWeeklyReport,
  fetchInsightsSummary,
  type TrendTopic,
  type ScheduledJob,
  type LineCostEstimate,
  type HpbConversion,
  type WeeklyReport,
  type InsightsSummary,
} from '../lib/api';
import SetupDiagnosisCard from '../components/SetupDiagnosisCard';
import DemoDataBanner from '../components/DemoDataBanner';
import EmptyState from '../components/EmptyState';
import { useSetupSignals } from '../hooks/useSetupSignals';
import GlossTooltip from '../components/GlossTooltip';

export default function Dashboard() {
  const { signals, isSample } = useSetupSignals();
  const [metrics, setMetrics] = useState(mockMetrics);
  const [mission, setMission] = useState(mockMission);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendTopic[]>([]);
  const [pendingJobs, setPendingJobs] = useState<ScheduledJob[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [lineCost, setLineCost] = useState<LineCostEstimate | null>(null);
  const [hpbConversions, setHpbConversions] = useState<HpbConversion[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [usingTrendId, setUsingTrendId] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [healthAlerts, setHealthAlerts] = useState<string[]>([]);
  const [regional, setRegional] = useState<Array<{ topic: string; hook: string; score: number }>>([]);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [insights, setInsights] = useState<InsightsSummary | null>(null);

  useEffect(() => {
    fetchInsightsSummary()
      .then((r) => setInsights(r.summary))
      .catch(() => setInsights(null));

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
    fetchScheduledJobs('failed')
      .then((r) => setFailedCount(r.jobs.length))
      .catch(() => {});
    fetchLineCostEstimate()
      .then(setLineCost)
      .catch(() => {});
    fetchHpbConversions()
      .then((r) => setHpbConversions(r.conversions))
      .catch(() => {});
    fetchConnectionHealth()
      .then((h) => {
        setHealthScore(h.score);
        setHealthAlerts(h.alerts.slice(0, 3).map((a) => a.detail));
      })
      .catch(() => {});
    fetchRegionalWatch()
      .then((r) => setRegional(r.ideas.slice(0, 3)))
      .catch(() => {});
    fetchWeeklyReport()
      .then((r) => setWeekly(r.report))
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

  const handleUseTrendAsMission = async (trendId: string) => {
    setUsingTrendId(trendId);
    try {
      const r = await useTrend(trendId);
      window.location.href = `/magic-creator?idea=${encodeURIComponent(r.idea)}`;
    } catch {
      /* ignore */
    }
    setUsingTrendId(null);
  };

  const topTrend = trends[0];

  return (
    <div className="buzz-page">
      {loading && <p className="text-sm text-neutral-500">データを読み込み中...</p>}

      <DemoDataBanner isSample={isSample} />

      <section className="border border-neutral-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">はじめての流れ</p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-4">
          {[
            { step: '1', label: 'ネタを溜める', to: '/inbox', hint: 'ネタInbox' },
            { step: '2', label: '各SNS用に作る', to: '/magic-creator', hint: 'ネタクリエイター' },
            { step: '3', label: '媒体で整えて予約', to: '/sns/instagram', hint: 'SNS' },
            { step: '4', label: '全体を確認', to: '/calendar', hint: '投稿カレンダー' },
          ].map((item) => (
            <Link
              key={item.step}
              to={item.to}
              className="border border-neutral-200 bg-[#f5f4f0] p-3 transition-colors hover:border-neutral-900"
            >
              <p className="text-[10px] font-bold text-neutral-400">STEP {item.step}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{item.hint}</p>
            </Link>
          ))}
        </ol>
        <p className="mt-3 text-xs text-neutral-500">
          事業所の特徴や X / Meta などの API は{' '}
          <Link to="/settings" className="underline-offset-2 hover:underline">
            設定
          </Link>
          で先に整えると、投稿文にも反映しやすくなります。
        </p>
      </section>

      <SetupDiagnosisCard signals={signals} />

      {insights && (
        <section className="border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                SNSインプレッション（自動取得）
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {insights.lastSyncedAt
                  ? `最終同期 ${new Date(insights.lastSyncedAt).toLocaleString('ja-JP')}`
                  : '未同期 — 投稿後に朝・昼・夜で取得、または設定から手動同期'}
              </p>
            </div>
            <Link to="/settings?tab=sns" className="text-xs underline-offset-2 hover:underline">
              同期設定 →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-500">合計表示</p>
              <p className="text-lg font-bold tabular-nums">{insights.totalImpressions.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">リーチ</p>
              <p className="text-lg font-bold tabular-nums">{insights.totalReach.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">計測投稿</p>
              <p className="text-lg font-bold tabular-nums">{insights.postCount}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">X取得</p>
              <p className="text-sm font-medium">
                {insights.xInsightsEnabled ? 'オン' : 'オフ（費用ガード）'}
              </p>
            </div>
          </div>
          {!insights.insightsEnabled && (
            <p className="mt-2 text-xs text-amber-800">インサイト同期がオフです。設定から有効化できます。</p>
          )}
        </section>
      )}

      {weekly && (
        <section className="border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">週次レポート</p>
              <p className="mt-1 text-sm text-neutral-600">{weekly.periodLabel}</p>
            </div>
            <Link to="/analytics" className="text-xs underline-offset-2 hover:underline">
              分析・売上で詳しく →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-500">健康スコア</p>
              <p className="text-lg font-bold tabular-nums">{weekly.healthScore}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">リーチ</p>
              <p className="text-lg font-bold tabular-nums">{weekly.funnel.reach.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">LINE友だち</p>
              <p className="text-lg font-bold tabular-nums">{weekly.funnel.lineSignups}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">失敗 / 承認待ち</p>
              <p className="text-lg font-bold tabular-nums">
                {weekly.scheduled.failed} / {weekly.scheduled.pendingApproval}
              </p>
            </div>
          </div>
          {weekly.nextWeekActions && weekly.nextWeekActions.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-neutral-600">
              {weekly.nextWeekActions.slice(0, 3).map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {healthScore != null && (
        <div className="border border-neutral-200 bg-white p-4 text-sm">
          <p className="font-medium">
            接続ヘルス {healthScore}%（
            <GlossTooltip term="Webhook" /> / <GlossTooltip term="Meta" /> / 予約URL）
          </p>
          {healthAlerts.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-amber-800">
              {healthAlerts.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          )}
          <Link to="/settings" className="mt-2 inline-block text-xs underline-offset-2 hover:underline">
            設定で直す →
          </Link>
        </div>
      )}

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

      {failedCount > 0 && (
        <Link
          to="/calendar"
          className="flex items-center gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-900 hover:border-red-400"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            投稿失敗が {failedCount} 件あります。カレンダーから再試行してください。
          </span>
          <ArrowRight className="ml-auto h-4 w-4" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="buzz-card lg:col-span-2">
          <div className="border-b border-neutral-200 bg-neutral-50 p-6 md:p-8">
            <p className="buzz-section-label mb-3">Today&apos;s Mission</p>
            <h2 className="text-2xl font-bold md:text-3xl" data-headline-max="28">{mission.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600 md:text-base">
              {mission.description}
            </p>
            {topTrend && (
              <div className="mt-4 border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
                  <Flame className="h-3.5 w-3.5" />
                  今日のトレンド枠
                </p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{topTrend.topic}</p>
                <p className="mt-0.5 text-xs text-neutral-600">{topTrend.hook}</p>
                <button
                  type="button"
                  disabled={usingTrendId === topTrend.id}
                  onClick={() => handleUseTrendAsMission(topTrend.id)}
                  className="mt-2 text-xs font-medium text-amber-900 underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {usingTrendId === topTrend.id ? '準備中...' : 'このトレンドで台本を作る →'}
                </button>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/magic-creator" className="buzz-btn-primary">
                内容を確認・承認する
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/calendar"
                className="inline-flex items-center gap-2 border border-neutral-300 bg-white px-4 py-2 text-sm hover:border-neutral-900"
              >
                カレンダーを見る
              </Link>
            </div>
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

      {pendingJobs.length > 0 ? (
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
                    className="buzz-btn-primary px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {approvingId === job.id ? '承認中...' : '承認して予約'}
                  </button>
                </div>
                <p className="line-clamp-2 text-sm text-neutral-600">
                  {job.contents.map((c) => c.label).join(' / ')} —{' '}
                  {job.contents[0]?.content.slice(0, 120)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Wand2}
          title="まだ承認待ちの投稿はありません"
          description="マジック・クリエイターで台本を作り、投稿モード「承認後」で予約すると、ここに並びます。毎朝ここでタップするだけで運用が回ります。"
          primaryLabel="最初の投稿を作る"
          primaryTo="/magic-creator"
          secondaryLabel="伴走ガイド"
          secondaryTo="/roadmap"
        />
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

      {regional.length > 0 && (
        <div className="buzz-card-pad">
          <h2 className="mb-3 text-lg font-bold">競合・地域ウォッチ（週次）</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {regional.map((r) => (
              <Link
                key={r.topic}
                to={`/magic-creator?idea=${encodeURIComponent(`${r.topic} — ${r.hook}`)}`}
                className="border border-neutral-200 bg-neutral-50 p-3 text-sm hover:border-neutral-400"
              >
                <p className="font-medium">{r.topic}</p>
                <p className="mt-1 text-xs text-neutral-600">{r.hook}</p>
              </Link>
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
            {trends.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleUseTrendAsMission(t.id)}
                className={`border p-4 text-left transition-colors hover:border-neutral-400 hover:bg-white ${
                  idx === 0 ? 'border-amber-300 bg-amber-50' : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                {idx === 0 && (
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    バズ狙い推奨
                  </p>
                )}
                <p className="text-sm font-medium">{t.topic}</p>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{t.hook}</p>
                <p className="mt-2 text-xs text-neutral-600">スコア {t.score}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
