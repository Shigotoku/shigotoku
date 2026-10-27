import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const PLAN_HINTS: Record<string, { need: string; unlock: string }> = {
  slack: { need: 'Team 以上', unlock: 'Slackネタ収集・戦略通知が使えます' },
  trends: { need: 'Pro 以上', unlock: 'トレンド自動更新が使えます' },
  segment: { need: 'Pro 以上', unlock: 'セグメント配信・ステップが使えます' },
  auto: { need: 'Growth OS', unlock: '完全自動運用モードが使えます' },
  hpb: { need: 'Growth OS', unlock: '予約寄与の詳細トラッキングが使えます' },
  export: { need: 'Starter 以上', unlock: 'データのバックアップ書き出しが使えます' },
};

export default function PlanLockNotice({
  feature,
  currentPlan,
}: {
  feature: keyof typeof PLAN_HINTS;
  currentPlan?: string;
}) {
  const hint = PLAN_HINTS[feature];
  if (!hint) return null;
  return (
    <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">この機能は {hint.need} で利用できます</p>
        <p className="mt-1 text-xs text-amber-900/80">
          今のプラン: {currentPlan ?? 'free'}。{hint.unlock}
        </p>
        <Link to="/settings" className="mt-2 inline-block text-xs font-medium underline-offset-2 hover:underline">
          プランを確認する →
        </Link>
      </div>
    </div>
  );
}
