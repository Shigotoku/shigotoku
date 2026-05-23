import { Check, Link2 } from 'lucide-react';
import { WATERMARK } from '../constants/brand';
import { useApp } from '../store/appContext';
import type { PlanTier } from '../types';

const plans: { id: PlanTier; name: string; price: string; features: string[] }[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '¥0',
    features: ['AI台本生成', 'SNS健康診断', `透かし付き（${WATERMARK}）`],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '¥4,980/月',
    features: ['全SNS自動予約', 'AI処方的提案', '透かし削除'],
  },
  {
    id: 'team',
    name: 'Team',
    price: '¥9,800/月',
    features: ['Slack連携（ネタ会議）', '戦略的通知（朝/昼/夜）', 'チーム承認フロー'],
  },
  {
    id: 'growth',
    name: 'Growth OS',
    price: '¥29,800/月',
    features: ['深い売上トラッキング', 'Auto Mode（完全自動運用）', 'アンバサダーCRM'],
  },
];

const snsConnections = [
  { name: 'Instagram', connected: true },
  { name: 'X (Twitter)', connected: true },
  { name: 'TikTok', connected: false },
  { name: 'LINE Official', connected: true },
];

export default function SettingsPage() {
  const { plan, setPlan } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">設定</h2>
        <p className="text-slate-400">プランとSNS連携の管理（MVPデモ）</p>
      </div>

      <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8">
        <h3 className="text-lg font-bold mb-6">プラン</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`text-left p-5 rounded-xl border transition-all ${
                plan === p.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">{p.name}</span>
                <span className="text-indigo-400 text-sm">{p.price}</span>
              </div>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="text-sm text-slate-400 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-indigo-400" />
          SNS連携（Ayrshare）
        </h3>
        <div className="space-y-3">
          {snsConnections.map((sns) => (
            <div
              key={sns.name}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800"
            >
              <span>{sns.name}</span>
              <span
                className={`text-xs px-3 py-1 rounded-full ${
                  sns.connected
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {sns.connected ? '接続済み' : '未接続'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
