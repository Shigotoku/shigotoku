import { useEffect, useState } from 'react';
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
  type AbTestRecord,
  type TrendTopic,
  type WeeklyReport,
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

  const loadAll = () => {
    fetchAnalytics()
      .then((data) => {
        setMetrics(data.metrics);
        if (data.topPosts.length) setTopPosts(data.topPosts);
        setAnalyticsLoaded(true);
      })
      .catch(() => setAnalyticsLoaded(true));
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

  return (
    <div className="buzz-page">
      <DemoDataBanner isSample={isSample || (analyticsLoaded && topPosts.length === 0 && metrics.reach === 0)} />

      {message && <p className="buzz-alert buzz-alert-info">{message}</p>}

      {weekly && (
        <div className="buzz-card-pad">
          <div className="mb-4 flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-neutral-700" />
            <h3 className="text-lg font-bold">週次レポート</h3>
            <span className="ml-auto text-xs text-neutral-500">{weekly.periodLabel}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">健康スコア</p>
              <p className="mt-1 text-xl font-bold">{weekly.healthScore}</p>
            </div>
            <div className="border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">リーチ</p>
              <p className="mt-1 text-xl font-bold">{weekly.funnel.reach.toLocaleString()}</p>
            </div>
            <div className="border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">LINE追加</p>
              <p className="mt-1 text-xl font-bold">{weekly.funnel.lineSignups}</p>
            </div>
            <div className="border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">失敗 / 承認待ち</p>
              <p className="mt-1 text-xl font-bold">
                {weekly.scheduled.failed} / {weekly.scheduled.pendingApproval}
              </p>
            </div>
          </div>
          {weekly.topTrend && (
            <p className="mt-4 text-sm text-neutral-700">
              注目トレンド: <span className="font-medium">{weekly.topTrend.topic}</span> — {weekly.topTrend.hook}
            </p>
          )}
          {weekly.nextWeekActions && weekly.nextWeekActions.length > 0 && (
            <div className="mt-4 border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">来週やる3こと</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                {weekly.nextWeekActions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </div>
          )}
          <ul className="mt-3 space-y-1 text-sm text-neutral-600">
            {weekly.recommendations.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-neutral-500">
            Pro以上かつ Slack 連携時は、毎週月曜 8:00 に同内容が Slack へ届きます。
          </p>
        </div>
      )}

      {analyticsLoaded && topPosts.length === 0 && metrics.reach === 0 && (
        <EmptyState
          icon={BarChart3}
          title="まだ分析できる投稿がありません"
          description="Meta / LINE を連携し、マジック・クリエイターから最初の投稿を予約すると、ここにリーチや売上寄与が表示されます。"
          primaryLabel="投稿を作る"
          primaryTo="/magic-creator"
          secondaryLabel="セットアップへ"
          secondaryTo="/dashboard"
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card) => (
          <div key={card.key} className="buzz-card-pad">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-700">
                <card.icon className="h-5 w-5" />
              </div>
              <span className="text-sm text-neutral-500">{card.label}</span>
            </div>
            <div className="buzz-stat-value text-xl">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="buzz-card-pad">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-neutral-700" />
            <h3 className="text-lg font-bold">トレンド波乗りエンジン</h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleRefreshTrends}
            className="buzz-btn-secondary px-3 py-1.5 text-sm disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            更新
          </button>
        </div>
        {trends.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="トレンドネタがまだありません"
            description="「更新」で今週の話題を取得できます（Pro以上）。取得したネタはワンタップでマジック・クリエイターに渡せます。"
            primaryLabel="ダッシュボードへ"
            primaryTo="/dashboard"
            secondaryLabel="クリエイターで自作"
            secondaryTo="/magic-creator"
          />
        ) : (
          <div className="space-y-3">
            {trends.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 border border-neutral-200 bg-neutral-50 p-4"
              >
                <div>
                  <p className="font-medium">{t.topic}</p>
                  <p className="mt-1 text-sm text-neutral-600">{t.hook}</p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {t.platform} · スコア {t.score}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUseTrend(t.id)}
                  className="buzz-btn-primary shrink-0 px-3 py-1.5 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  作成
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="buzz-card-pad space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-neutral-700" />
            <h3 className="text-lg font-bold">A/B テスト自動化</h3>
          </div>
          <button type="button" disabled={busy} onClick={handleEvaluateAll} className="buzz-btn-ghost text-sm">
            全テストを評価
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={abIdea}
            onChange={(e) => setAbIdea(e.target.value)}
            placeholder="テストするネタ（例: 春カラーキャンペーン）"
            className="buzz-input flex-1"
          />
          <select value={abPlatform} onChange={(e) => setAbPlatform(e.target.value)} className="buzz-input sm:w-40">
            <option value="reels">Reels</option>
            <option value="carousel">Carousel</option>
            <option value="x_thread">X</option>
            <option value="line">LINE</option>
          </select>
          <button
            type="button"
            disabled={busy || !abIdea.trim()}
            onClick={handleCreateAbTest}
            className="buzz-btn-primary disabled:opacity-60"
          >
            テスト作成
          </button>
        </div>
        <div className="space-y-4">
          {abTests.length === 0 && (
            <p className="text-sm text-neutral-500">
              A/B テストはまだありません。2パターンのフックを自動生成し、クリック率で勝者を判定します。
            </p>
          )}
          {abTests.map((test) => (
            <div key={test.id} className="space-y-3 border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">{test.idea}</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    test.status === 'completed'
                      ? 'border border-neutral-300 bg-white text-neutral-800'
                      : 'border border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  {test.status === 'completed' ? `勝者: ${test.winner}` : '実行中'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['A', 'B'] as const).map((key) => {
                  const v = key === 'A' ? test.variantA : test.variantB;
                  const isWinner = test.winner === key;
                  return (
                    <div
                      key={key}
                      className={`border p-3 text-sm ${
                        isWinner ? 'border-neutral-900 bg-white' : 'border-neutral-200 bg-white'
                      }`}
                    >
                      <p className="font-medium text-neutral-800">
                        Variant {key}: {v.label}
                      </p>
                      <p className="mt-1 line-clamp-3 text-neutral-600">{v.content}</p>
                      <p className="mt-2 text-xs text-neutral-500">
                        クリック {v.clicks} / 表示 {v.impressions}
                      </p>
                      {v.trackingUrl && (
                        <p className="mt-1 break-all text-xs text-neutral-600">{v.trackingUrl}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {test.winnerReason && <p className="text-xs text-neutral-500">{test.winnerReason}</p>}
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
      </div>

      <div className="buzz-card-pad">
        <div className="mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-neutral-700" />
          <h3 className="text-lg font-bold">投稿別 売上貢献度</h3>
        </div>
        <div className="space-y-4">
          {topPosts.length === 0 ? (
            <p className="text-sm text-neutral-500">
              投稿データがまだありません。クリエイターから予約投稿すると、ここに貢献度が並びます。
            </p>
          ) : (
            topPosts.map((post) => (
              <div
                key={post.id}
                className="flex flex-col gap-3 border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{post.title}</p>
                  <p className="text-sm text-neutral-500">
                    リーチ {post.reach.toLocaleString()}
                    {(post.clicks ?? 0) > 0 && ` · クリック ${post.clicks}`}
                    {(post.lineSignups ?? 0) > 0 && ` · LINE +${post.lineSignups}`}
                  </p>
                </div>
                <p className="buzz-stat-value text-base">¥{post.revenue.toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
        <Link to="/magic-creator" className="mt-4 inline-block text-sm text-neutral-600 hover:text-neutral-900">
          マジック・クリエイターで新規投稿 →
        </Link>
      </div>
    </div>
  );
}
