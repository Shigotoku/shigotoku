import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, TrendingUp, Users, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { kpiLabels, mockMetrics, mockMission } from '../data/mockDashboard';
import { fetchDashboard, fetchTrends, type TrendTopic } from '../lib/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(mockMetrics);
  const [mission, setMission] = useState(mockMission);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendTopic[]>([]);

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
          lineCvr: data.metrics.funnel.reach > 0
            ? Math.round((data.metrics.funnel.lineSignups / data.metrics.funnel.reach) * 1000) / 10
            : mockMetrics.lineCvr,
        });
        setMission({ ...data.metrics.mission, scriptCount: 3 });
      })
      .catch(() => {
        // Firestore 未設定時はモック表示
      })
      .finally(() => setLoading(false));
    fetchTrends()
      .then((r) => setTrends(r.trends.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {loading && (
        <p className="text-sm text-slate-500">Firestore から KPI を読み込み中...</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 p-8 flex flex-col justify-center relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold tracking-wider uppercase mb-4">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              Today's Mission
            </div>
            <h2 className="text-3xl font-bold mb-2">{mission.title}</h2>
            <p className="text-slate-400 mb-6">{mission.description}</p>
            <Link
              to="/magic-creator"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2 w-fit transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5"
            >
              内容を確認・承認する
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-lg font-medium text-slate-300 mb-1">SNS健康スコア</h3>
            <p className="text-sm text-slate-500">アカウントの総合的な評価</p>
          </div>
          <div className="flex items-end gap-3 mt-4">
            <span className="text-6xl font-bold tracking-tight text-white">{metrics.healthScore}</span>
            <div className="flex items-center gap-1 text-emerald-400 pb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">+{metrics.healthTrend}%</span>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">{kpiLabels.awareness}</span>
              <span className="text-white font-medium">{metrics.reachRating}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{kpiLabels.conversion}</span>
              <span className="text-emerald-400 font-medium">{metrics.clickRating}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold mb-1">売上ファネルトラッキング</h3>
            <p className="text-sm text-slate-400">投稿 → LINE/LP遷移 → 来店 → 売上の流れを可視化</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-400 mb-1">総リーチ数</div>
            <div className="text-2xl font-bold">{metrics.reach.toLocaleString()}</div>
          </div>
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 relative">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-400 mb-1">{kpiLabels.leads}</div>
            <div className="text-2xl font-bold">
              {metrics.lineFriends}{' '}
              <span className="text-sm font-normal text-emerald-400 ml-2">CVR {metrics.lineCvr}%</span>
            </div>
          </div>
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 relative">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-400 mb-1">{kpiLabels.revenue}</div>
            <div className="text-2xl font-bold text-emerald-400">
              ¥{metrics.estimatedRevenue.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>

      {trends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">今週のトレンドネタ</h3>
            <Link to="/analytics" className="text-sm text-indigo-400 hover:text-indigo-300">
              すべて見る →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {trends.map((t) => (
              <Link
                key={t.id}
                to={`/magic-creator?idea=${encodeURIComponent(`${t.topic} — ${t.hook}`)}`}
                className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/40 transition-colors"
              >
                <p className="font-medium text-sm">{t.topic}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.hook}</p>
                <p className="text-xs text-indigo-300 mt-2">スコア {t.score}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
