import { useEffect, useState } from 'react';
// 画面いっぱいに表示（DashboardLayout の isFullPage 対象）
import { Link } from 'react-router-dom';
import { BarChart3, Share2, MousePointerClick, Users, DollarSign, TrendingUp, FlaskConical, RefreshCw, Sparkles, CalendarRange } from 'lucide-react';
import { kpiLabels } from '../data/mockDashboard';
import {
  fetchAnalytics,
  fetchTrends,
  refreshTrends,
  useTrend,
  fetchAbTests,
  createAbTest,
  evaluateAbTest,
  evaluateAllAbTests,
  fetchWeeklyReport,
  fetchInsightsSummary,
  syncInsights,
  type AbTestRecord,
  type TrendTopic,
  type WeeklyReport,
  type InsightsSummary,
} from '../lib/api';
import EmptyState from '../components/EmptyState';
import DemoDataBanner from '../components/DemoDataBanner';
import { useSetupSignals } from '../hooks/useSetupSignals';

export default function AnalyticsPage() {
  const { isSample } = useSetupSignals();
  const [metrics, setMetrics] = useState({
    reach: 0,
    saveRate: 0,
    shareRate: 0,
    clickRate: 0,
    lineFriends: 0,
    estimatedRevenue: 0,
  });
  const [topPosts, setTopPosts] = useState<
    Array<{ id: string; title: string; reach: number; revenue: number; clicks?: number; lineSignups?: number }>
  >([]);
  const [trends, setTrends] = useState<TrendTopic[]>([]);
  const [abTests, setAbTests] = useState<AbTestRecord[]>([]);
  const [abIdea, setAbIdea] = useState('');
  const [abPlatform, setAbPlatform] = useState('reels');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [insightsSyncing, setInsightsSyncing] = useState(false);

  const loadAll = () => {
    fetchAnalytics()
      .then((data) => {
        setMetrics(data.metrics);
        if (data.topPosts.length) setTopPosts(data.topPosts);
        setAnalyticsLoaded(true);
      })
      .catch(() => setAnalyticsLoaded(true));
    fetchInsightsSummary()
      .then((r) => setInsights(r.summary))
      .catch(() => setInsights(null));
    fetchTrends()
      .then((r) => setTrends(r.trends))
      .catch(() => {});
    fetchAbTests()
      .then((r) => setAbTests(r.tests))
      .catch(() => {});
    fetchWeeklyReport()
      .then((r) => setWeekly(r.report))
      .catch(() => {});
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRefreshTrends = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await refreshTrends();
      setTrends(r.trends);
      setMessage('トレンドを更新しました');
    } catch {
      setMessage('トレンド更新に失敗しました（Pro プラン以上が必要です）');
    }
    setBusy(false);
  };

  const handleUseTrend = async (id: string) => {
    try {
      const r = await useTrend(id);
      window.location.href = `/magic-creator?idea=${encodeURIComponent(r.idea)}`;
    } catch {
      setMessage('トレンドの適用に失敗しました');
    }
  };

  const handleCreateAbTest = async () => {
    if (!abIdea.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const test = await createAbTest(abIdea.trim(), abPlatform);
      setAbTests((prev) => [test, ...prev]);
      setAbIdea('');
      setMessage('A/B テストを作成しました。各バリアントの計測リンクを投稿に使用してください。');
    } catch {
      setMessage('A/B テスト作成に失敗しました（Pro プラン以上が必要です）');
    }
    setBusy(false);
  };

  const handleEvaluateAll = async () => {
    setBusy(true);
    try {
      const r = await evaluateAllAbTests();
      setAbTests(r.tests);
      setMessage(`${r.evaluated} 件の A/B テストを評価しました`);
    } catch {
      setMessage('評価に失敗しました');
    }
    setBusy(false);
  };

  const kpiCards = [
    { key: 'awareness', label: kpiLabels.awareness, value: metrics.reach.toLocaleString(), icon: Users },
    { key: 'interest', label: kpiLabels.interest, value: `保存率 ${metrics.saveRate}% / シェア率 ${metrics.shareRate}%`, icon: Share2 },
    { key: 'conversion', label: kpiLabels.conversion, value: `URLクリック率 ${metrics.clickRate}%`, icon: MousePointerClick },
    { key: 'leads', label: kpiLabels.leads, value: `${metrics.lineFriends}件`, icon: Users },
    { key: 'revenue', label: kpiLabels.revenue, value: `¥${metrics.estimatedRevenue.toLocaleString()}`, icon: DollarSign },
  ];

  const [subTab, setSubTab] = useState<'trend' | 'ab'>('trend');
  const card = 'flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white p-3 shadow-sm lg:min-h-0';
  const body = 'mt-2 min-h-0 flex-1 overflow-y-auto';
  const statBox = 'border border-neutral-200 bg-neutral-50 px-2.5 py-1.5';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {(isSample || (analyticsLoaded && topPosts.length === 0 && metrics.reach === 0)) && (
        <div className="shrink-0">
          <DemoDataBanner isSample={isSample || (analyticsLoaded && topPosts.length === 0 && metrics.reach === 0)} />
        </div>
      )}

      {message && <p className="buzz-alert buzz-alert-info shrink-0 text-sm">{message}</p>}

      {/* KPI（1行） */}
      <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {kpiCards.map((c) => (
          <div key={c.key} className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 shadow-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-700">
              <c.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-neutral-500">{c.label}</p>
              <p className="truncate text-sm font-bold tabular-nums">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* 1列目: インプレッション + 週次レポート */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          {insights && (
            <section className={`${card} lg:flex-1`}>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <BarChart3 className="h-4 w-4 text-neutral-700" />
                <h3 className="text-sm font-bold">SNSインプレッション（自動取得）</h3>
                <button
                  type="button"
                  disabled={insightsSyncing || !insights.insightsEnabled}
                  className="ml-auto inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline disabled:opacity-50"
                  onClick={async () => {
                    setInsightsSyncing(true);
                    try {
                      const r = await syncInsights(true);
                      setInsights(r.summary);
                      setMessage('インサイトを同期しました');
                    } catch {
                      setMessage('インサイト同期に失敗しました');
                    }
                    setInsightsSyncing(false);
                  }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${insightsSyncing ? 'animate-spin' : ''}`} />
                  {insightsSyncing ? '同期中…' : '今すぐ同期'}
                </button>
              </div>
              <div className={body}>
                <div className="grid grid-cols-4 gap-2">
                  <div className={statBox}>
                    <p className="text-[11px] text-neutral-500">合計表示</p>
                    <p className="text-base font-bold tabular-nums">{insights.totalImpressions.toLocaleString()}</p>
                  </div>
                  <div className={statBox}>
                    <p className="text-[11px] text-neutral-500">リーチ</p>
                    <p className="text-base font-bold tabular-nums">{insights.totalReach.toLocaleString()}</p>
                  </div>
                  <div className={statBox}>
                    <p className="text-[11px] text-neutral-500">計測投稿</p>
                    <p className="text-base font-bold tabular-nums">{insights.postCount}</p>
                  </div>
                  <div className={statBox}>
                    <p className="text-[11px] text-neutral-500">X取得</p>
                    <p className="text-xs font-medium">{insights.xInsightsEnabled ? 'オン' : 'オフ'}</p>
                  </div>
                </div>
                {insights.recent.length > 0 && (
                  <ul className="mt-2 divide-y divide-neutral-100 border border-neutral-200">
                    {insights.recent.slice(0, 8).map((row) => (
                      <li key={row.id} className="flex justify-between gap-3 px-2.5 py-1.5 text-xs">
                        <span className="truncate text-neutral-700">
                          [{row.platform}] {row.preview || row.externalId}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">{(row.impressions || 0).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-neutral-500">
                  <Link to="/settings?tab=sns" className="underline-offset-2 hover:underline">SNS連携設定</Link>
                  で Meta 再連携と X 費用ガードを管理できます。
                </p>
              </div>
            </section>
          )}

          {weekly && (
            <section className={`${card} lg:flex-1`}>
              <div className="flex shrink-0 items-center gap-2">
                <CalendarRange className="h-4 w-4 text-neutral-700" />
                <h3 className="text-sm font-bold">週次レポート</h3>
                <span className="ml-auto text-[11px] text-neutral-500">{weekly.periodLabel}</span>
              </div>
              <div className={body}>
                <div className="grid grid-cols-4 gap-2">
                  <div className={statBox}>
                    <p className="text-[11px] text-neutral-500">健康スコア</p>
                    <p className="text-base font-bold">{weekly.healthScore}</p>
                  </div>
                  <div className={statBox}>
                    <p className="text-[11px] text-neutral-500">リーチ</p>
                    <p className="text-base font-bold">{weekly.funnel.reach.toLocaleString()}</p>
                  </div>
                  <div className={statBox}>
                    <p className="text-[11px] text-neutral-500">LINE追加</p>
                    <p className="text-base font-bold">{weekly.funnel.lineSignups}</p>
                  </div>
                  <div className={statBox}>
                    <p className="text-[11px] text-neutral-500">失敗/承認待ち</p>
                    <p className="text-base font-bold">{weekly.scheduled.failed} / {weekly.scheduled.pendingApproval}</p>
                  </div>
                </div>
                {weekly.topTrend && (
                  <p className="mt-2 text-xs text-neutral-700">
                    注目トレンド: <span className="font-medium">{weekly.topTrend.topic}</span> — {weekly.topTrend.hook}
                  </p>
                )}
                {weekly.nextWeekActions && weekly.nextWeekActions.length > 0 && (
                  <div className="mt-2 border border-neutral-200 bg-neutral-50 p-2">
                    <p className="text-[11px] font-bold text-neutral-500">来週やる3こと</p>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs">
                      {weekly.nextWeekActions.map((a) => (<li key={a}>{a}</li>))}
                    </ol>
                  </div>
                )}
                <ul className="mt-2 space-y-0.5 text-xs text-neutral-600">
                  {weekly.recommendations.map((r) => (<li key={r}>• {r}</li>))}
                </ul>
                <p className="mt-2 text-[11px] text-neutral-500">
                  Pro以上かつ Slack 連携時は、毎週月曜 8:00 に同内容が Slack へ届きます。
                </p>
              </div>
            </section>
          )}
        </div>

        {/* 2列目: 投稿別 売上貢献度 */}
        <section className={card}>
          <div className="flex shrink-0 items-center gap-2">
            <BarChart3 className="h-4 w-4 text-neutral-700" />
            <h3 className="text-sm font-bold">投稿別 売上貢献度</h3>
            <Link to="/magic-creator" className="ml-auto text-xs text-neutral-600 hover:text-neutral-900">
              新規投稿 →
            </Link>
          </div>
          <div className={`${body} space-y-2`}>
            {topPosts.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="まだ分析できる投稿がありません"
                description="Meta / LINE を連携し、マジック・クリエイターから最初の投稿を予約すると、ここにリーチや売上寄与が表示されます。"
                primaryLabel="投稿を作る"
                primaryTo="/magic-creator"
                secondaryLabel="セットアップへ"
                secondaryTo="/dashboard"
              />
            ) : (
              topPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-3 border border-neutral-200 bg-neutral-50 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{post.title}</p>
                    <p className="text-xs text-neutral-500">
                      リーチ {post.reach.toLocaleString()}
                      {(post.clicks ?? 0) > 0 && ` · クリック ${post.clicks}`}
                      {(post.lineSignups ?? 0) > 0 && ` · LINE +${post.lineSignups}`}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums">¥{post.revenue.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 3列目: トレンド / A/Bテスト（タブ） */}
        <section className={card}>
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setSubTab('trend')}
              className={`inline-flex items-center gap-1 border px-2.5 py-1 text-xs ${subTab === 'trend' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              トレンド波乗り
            </button>
            <button
              type="button"
              onClick={() => setSubTab('ab')}
              className={`inline-flex items-center gap-1 border px-2.5 py-1 text-xs ${subTab === 'ab' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              A/Bテスト
            </button>
            <span className="ml-auto">
              {subTab === 'trend' ? (
                <button type="button" disabled={busy} onClick={handleRefreshTrends} className="inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline disabled:opacity-60">
                  <RefreshCw className="h-3.5 w-3.5" />
                  更新
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={handleEvaluateAll} className="text-xs underline-offset-2 hover:underline disabled:opacity-60">
                  全テストを評価
                </button>
              )}
            </span>
          </div>

          {subTab === 'trend' ? (
            <div className={`${body} space-y-2`}>
              {trends.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="トレンドネタがまだありません"
                  description="「更新」で今週の話題を取得できます（Pro以上）。取得したネタはワンタップでマジック・クリエイターに渡せます。"
                  primaryLabel="クリエイターで自作"
                  primaryTo="/magic-creator"
                />
              ) : (
                trends.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-3 border border-neutral-200 bg-neutral-50 p-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t.topic}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-neutral-600">{t.hook}</p>
                      <p className="mt-1 text-[11px] text-neutral-500">{t.platform} · スコア {t.score}</p>
                    </div>
                    <button type="button" onClick={() => handleUseTrend(t.id)} className="buzz-btn-primary shrink-0 px-2.5 py-1 text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                      作成
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={`${body} space-y-2`}>
              <div className="flex flex-col gap-2 xl:flex-row">
                <input
                  value={abIdea}
                  onChange={(e) => setAbIdea(e.target.value)}
                  placeholder="テストするネタ（例: 春カラーキャンペーン）"
                  className="buzz-input min-w-0 flex-1 !py-1.5 text-sm"
                />
                <select value={abPlatform} onChange={(e) => setAbPlatform(e.target.value)} className="buzz-input !py-1.5 text-sm xl:w-28">
                  <option value="reels">Reels</option>
                  <option value="carousel">Carousel</option>
                  <option value="x_thread">X</option>
                  <option value="line">LINE</option>
                </select>
                <button
                  type="button"
                  disabled={busy || !abIdea.trim()}
                  onClick={handleCreateAbTest}
                  className="buzz-btn-primary !py-1.5 text-sm disabled:opacity-60"
                >
                  テスト作成
                </button>
              </div>
              {abTests.length === 0 && (
                <p className="text-xs text-neutral-500">
                  A/B テストはまだありません。2パターンのフックを自動生成し、クリック率で勝者を判定します。
                </p>
              )}
              {abTests.map((test) => (
                <div key={test.id} className="space-y-2 border border-neutral-200 bg-neutral-50 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{test.idea}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                        test.status === 'completed'
                          ? 'border border-neutral-300 bg-white text-neutral-800'
                          : 'border border-amber-200 bg-amber-50 text-amber-900'
                      }`}
                    >
                      {test.status === 'completed' ? `勝者: ${test.winner}` : '実行中'}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(['A', 'B'] as const).map((key) => {
                      const v = key === 'A' ? test.variantA : test.variantB;
                      const isWinner = test.winner === key;
                      return (
                        <div key={key} className={`border bg-white p-2 text-xs ${isWinner ? 'border-neutral-900' : 'border-neutral-200'}`}>
                          <p className="font-medium text-neutral-800">Variant {key}: {v.label}</p>
                          <p className="mt-0.5 line-clamp-3 text-neutral-600">{v.content}</p>
                          <p className="mt-1 text-[11px] text-neutral-500">クリック {v.clicks} / 表示 {v.impressions}</p>
                          {v.trackingUrl && <p className="mt-0.5 break-all text-[11px] text-neutral-600">{v.trackingUrl}</p>}
                        </div>
                      );
                    })}
                  </div>
                  {test.winnerReason && <p className="text-[11px] text-neutral-500">{test.winnerReason}</p>}
                  {test.status === 'running' && (
                    <button
                      type="button"
                      onClick={() =>
                        evaluateAbTest(test.id).then((r) => setAbTests((prev) => prev.map((t) => (t.id === r.id ? r : t))))
                      }
                      className="text-xs text-neutral-700 underline-offset-2 hover:underline"
                    >
                      今すぐ評価
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
