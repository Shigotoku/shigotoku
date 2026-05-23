import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Share2, MousePointerClick, Users, DollarSign, TrendingUp, FlaskConical, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
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
  type AbTestRecord,
  type TrendTopic,
} from '../lib/api';

export default function AnalyticsPage() {
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

  const loadAll = () => {
    fetchAnalytics()
      .then((data) => {
        setMetrics(data.metrics);
        if (data.topPosts.length) setTopPosts(data.topPosts);
      })
      .catch(() => {});
    fetchTrends()
      .then((r) => setTrends(r.trends))
      .catch(() => {});
    fetchAbTests()
      .then((r) => setAbTests(r.tests))
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
    { key: 'awareness', label: kpiLabels.awareness, value: metrics.reach.toLocaleString(), icon: Users, iconClass: 'text-blue-400', bgClass: 'bg-blue-500/20' },
    { key: 'interest', label: kpiLabels.interest, value: `保存率 ${metrics.saveRate}% / シェア率 ${metrics.shareRate}%`, icon: Share2, iconClass: 'text-purple-400', bgClass: 'bg-purple-500/20' },
    { key: 'conversion', label: kpiLabels.conversion, value: `URLクリック率 ${metrics.clickRate}%`, icon: MousePointerClick, iconClass: 'text-indigo-400', bgClass: 'bg-indigo-500/20' },
    { key: 'leads', label: kpiLabels.leads, value: `${metrics.lineFriends}件`, icon: Users, iconClass: 'text-sky-400', bgClass: 'bg-sky-500/20' },
    { key: 'revenue', label: kpiLabels.revenue, value: `¥${metrics.estimatedRevenue.toLocaleString()}`, icon: DollarSign, iconClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">分析・売上</h2>
        <p className="text-slate-400">トレンド波乗り・A/B テスト・UTM/LINE 自動計測</p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bgClass} flex items-center justify-center ${card.iconClass}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <span className="text-sm text-slate-400">{card.label}</span>
            </div>
            <div className="text-xl font-bold">{card.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-400" />
            <h3 className="text-lg font-bold">トレンド波乗りエンジン</h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleRefreshTrends}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm hover:border-indigo-500 disabled:opacity-60"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>
        {trends.length === 0 ? (
          <p className="text-sm text-slate-500">トレンドがありません。「更新」で今週のネタを取得してください（Pro 以上）。</p>
        ) : (
          <div className="space-y-3">
            {trends.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div>
                  <p className="font-medium">{t.topic}</p>
                  <p className="text-sm text-slate-400 mt-1">{t.hook}</p>
                  <p className="text-xs text-slate-500 mt-2">{t.platform} · スコア {t.score}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUseTrend(t.id)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  作成
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">A/B テスト自動化</h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleEvaluateAll}
            className="text-sm text-indigo-300 hover:text-indigo-200"
          >
            全テストを評価
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={abIdea}
            onChange={(e) => setAbIdea(e.target.value)}
            placeholder="テストするネタ（例: 春カラーキャンペーン）"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
          />
          <select
            value={abPlatform}
            onChange={(e) => setAbPlatform(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm"
          >
            <option value="reels">Reels</option>
            <option value="carousel">Carousel</option>
            <option value="x_thread">X</option>
            <option value="line">LINE</option>
          </select>
          <button
            type="button"
            disabled={busy || !abIdea.trim()}
            onClick={handleCreateAbTest}
            className="px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-sm font-medium disabled:opacity-60"
          >
            テスト作成
          </button>
        </div>
        <div className="space-y-4">
          {abTests.length === 0 && (
            <p className="text-sm text-slate-500">A/B テストはまだありません。2パターンのフックを自動生成し、クリック率で勝者を判定します。</p>
          )}
          {abTests.map((test) => (
            <div key={test.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{test.idea}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${test.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {test.status === 'completed' ? `勝者: ${test.winner}` : '実行中'}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {(['A', 'B'] as const).map((key) => {
                  const v = key === 'A' ? test.variantA : test.variantB;
                  const isWinner = test.winner === key;
                  return (
                    <div key={key} className={`p-3 rounded-lg border text-sm ${isWinner ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800'}`}>
                      <p className="font-medium text-slate-300">Variant {key}: {v.label}</p>
                      <p className="text-slate-400 mt-1 line-clamp-3">{v.content}</p>
                      <p className="text-xs text-slate-500 mt-2">クリック {v.clicks} / 表示 {v.impressions}</p>
                      {v.trackingUrl && (
                        <p className="text-xs text-indigo-300 mt-1 break-all">{v.trackingUrl}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {test.winnerReason && (
                <p className="text-xs text-slate-500">{test.winnerReason}</p>
              )}
              {test.status === 'running' && (
                <button
                  type="button"
                  onClick={() => evaluateAbTest(test.id).then((r) => setAbTests((prev) => prev.map((t) => (t.id === r.id ? r : t))))}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  今すぐ評価
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold">投稿別 売上貢献度</h3>
        </div>
        <div className="space-y-4">
          {topPosts.map((post) => (
            <div key={post.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div>
                <p className="font-medium">{post.title}</p>
                <p className="text-sm text-slate-500">
                  リーチ {post.reach.toLocaleString()}
                  {(post.clicks ?? 0) > 0 && ` · クリック ${post.clicks}`}
                  {(post.lineSignups ?? 0) > 0 && ` · LINE +${post.lineSignups}`}
                </p>
              </div>
              <p className="text-emerald-400 font-bold">¥{post.revenue.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <Link to="/magic-creator" className="inline-block mt-4 text-sm text-indigo-400 hover:text-indigo-300">
          マジック・クリエイターで新規投稿 →
        </Link>
      </div>
    </div>
  );
}
