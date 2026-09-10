import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, TrendingDown } from 'lucide-react';
import type { NextScheduledPost, XSeriesInsights } from '../lib/api';
import type { XSeriesCapabilities } from '../lib/xSeriesFeatures';

type Props = {
  insights: XSeriesInsights | null;
  nextPosts: NextScheduledPost[];
  caps: XSeriesCapabilities;
};

export default function XSeriesInsightsPanel({ insights, nextPosts, caps }: Props) {
  if (!insights) return null;

  const warnings: string[] = [];
  if (insights.lowStockWarning) {
    warnings.push(`在庫が約${insights.weeksOfStock ?? 0}週分です（${caps.stockAlertWeeks}週未満でアラート）`);
  }
  if (insights.stockRunsOutBeforeMonthEnd) {
    warnings.push('月末までに在庫が足りない可能性があります');
  }
  if (insights.xPostsRemaining < insights.approvedStock) {
    warnings.push(`X API月上限まで残り${insights.xPostsRemaining}件（在庫${insights.approvedStock}本）`);
  }

  return (
    <div className="space-y-3">
      {warnings.length > 0 && (
        <div className="buzz-banner buzz-banner-warning">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            在庫・上限チェック
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          {caps.upgradeHint && (
            <p className="mt-2 text-xs">
              <Link to="/settings?tab=plan" className="text-violet-700 underline underline-offset-2">
                {caps.upgradeHint}
              </Link>
            </p>
          )}
        </div>
      )}

      {nextPosts.length > 0 && (
        <div className="buzz-card-pad !p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CalendarClock className="h-4 w-4" />
            次の投稿予定（最大{caps.nextPostsPreview}件）
          </p>
          <ul className="mt-2 space-y-2">
            {nextPosts.slice(0, caps.nextPostsPreview).map((p, i) => (
              <li key={`${p.at}-${i}`} className="border-l-2 border-violet-200 pl-3 text-xs">
                <span className="font-medium text-neutral-700">
                  {new Date(p.at).toLocaleString('ja-JP', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <p className="mt-0.5 line-clamp-2 text-neutral-600">{p.previewText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.nextFireAt && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <TrendingDown className="h-3.5 w-3.5" />
          次のルール発火: {new Date(insights.nextFireAt).toLocaleString('ja-JP')}
        </p>
      )}
    </div>
  );
}
