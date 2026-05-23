import { BarChart3, Share2, MousePointerClick, Users, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { kpiLabels, mockMetrics } from '../data/mockDashboard';

const kpiCards = [
  { key: 'awareness', label: kpiLabels.awareness, value: '24,500', icon: Users, iconClass: 'text-blue-400', bgClass: 'bg-blue-500/20' },
  { key: 'interest', label: kpiLabels.interest, value: '保存率 8.2% / シェア率 2.1%', icon: Share2, iconClass: 'text-purple-400', bgClass: 'bg-purple-500/20' },
  { key: 'conversion', label: kpiLabels.conversion, value: 'URLクリック率 1.8%', icon: MousePointerClick, iconClass: 'text-indigo-400', bgClass: 'bg-indigo-500/20' },
  { key: 'leads', label: kpiLabels.leads, value: `${mockMetrics.lineFriends}件`, icon: Users, iconClass: 'text-sky-400', bgClass: 'bg-sky-500/20' },
  { key: 'revenue', label: kpiLabels.revenue, value: `¥${mockMetrics.estimatedRevenue.toLocaleString()}`, icon: DollarSign, iconClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20' },
];

const topPosts = [
  { title: '春カラーショート動画', reach: 12400, revenue: 128000 },
  { title: '【悲報】カラー失敗フック', reach: 8200, revenue: 98000 },
  { title: 'スタッフ紹介カルーセル', reach: 3900, revenue: 56000 },
];

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">分析・売上</h2>
        <p className="text-slate-400">要件定義のKPI設計に基づく経営判断用ダッシュボード（Phase 1: デモデータ）</p>
      </div>

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
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold">投稿別 売上貢献度</h3>
        </div>
        <div className="space-y-4">
          {topPosts.map((post) => (
            <div key={post.title} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div>
                <p className="font-medium">{post.title}</p>
                <p className="text-sm text-slate-500">リーチ {post.reach.toLocaleString()}</p>
              </div>
              <p className="text-emerald-400 font-bold">¥{post.revenue.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
