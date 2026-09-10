import { Link } from 'react-router-dom';
import {
  BarChart3,
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  MousePointerClick,
  Users,
  FileText,
} from 'lucide-react';
import InsightsReportExportMenu from './InsightsReportExportMenu';
import type { InsightsDashboard, InsightsPlatformFilter } from '../lib/api';
import SimpleBarChart from './charts/SimpleBarChart';
import SimpleLineChart from './charts/SimpleLineChart';

const PLATFORM_TABS: Array<{ id: InsightsPlatformFilter; label: string }> = [
  { id: 'all', label: 'すべて' },
  { id: 'x', label: 'X' },
  { id: 'instagram', label: 'IG' },
  { id: 'facebook', label: 'FB' },
  { id: 'line', label: 'LINE' },
];

const PLATFORM_LABEL: Record<string, string> = {
  x: 'X',
  instagram: 'IG',
  facebook: 'FB',
  threads: 'Threads',
  line: 'LINE',
};

type Props = {
  dashboard: InsightsDashboard | null;
  platform: InsightsPlatformFilter;
  onPlatformChange: (p: InsightsPlatformFilter) => void;
  onAnalyze: () => void;
  analyzing: boolean;
  compact?: boolean;
};

function TakeawayIcon({ type }: { type: 'success' | 'warning' | 'tip' }) {
  if (type === 'success') return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (type === 'warning') return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />;
  return <Lightbulb className="h-4 w-4 shrink-0 text-violet-600" />;
}

export default function InsightsDashboardPanel({
  dashboard,
  platform,
  onPlatformChange,
  onAnalyze,
  analyzing,
  compact = false,
}: Props) {
  const showSnsCharts = platform !== 'line';
  const lineOnly = platform === 'line';
  const fbOnly = platform === 'facebook';

  const platformBars = dashboard
    ? Object.entries(dashboard.byPlatform).map(([key, v]) => ({
        label: PLATFORM_LABEL[key] ?? key,
        value: v.impressions,
        color: key === 'instagram' ? '#E1306C' : key === 'x' ? '#171717' : undefined,
      }))
    : [];

  const lineSeries = dashboard?.dailySeries.map((d) => ({
    date: d.date,
    value: d.impressions,
  })) ?? [];

  const engagementSeries = dashboard?.dailySeries.map((d) => ({
    date: d.date,
    value: d.engagements,
  })) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PLATFORM_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onPlatformChange(tab.id)}
            className={platform === tab.id ? 'buzz-segment-active' : 'buzz-segment'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={analyzing}
          onClick={onAnalyze}
          className="buzz-btn-accent flex min-h-[52px] flex-1 items-center justify-center gap-2 text-sm disabled:opacity-70"
        >
          {analyzing ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              解析を更新中…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              解析を更新（同期＋グラフ）
            </>
          )}
        </button>
        {!compact && <InsightsReportExportMenu platform={platform} disabled={!dashboard} />}
      </div>

      {dashboard?.lastSyncedAt && (
        <p className="text-center text-[11px] text-neutral-500">
          最終同期: {new Date(dashboard.lastSyncedAt).toLocaleString('ja-JP')}
          {dashboard.aiPowered ? ' · AIサマリー' : ''}
          {(dashboard.snapshotDays ?? 0) >= 3
            ? ` · 履歴 ${dashboard.snapshotDays}日`
            : ' · 履歴蓄積中'}
        </p>
      )}

      {dashboard && (
        <>
          {dashboard.takeaways.length > 0 && !compact && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <TrendingUp className="h-4 w-4" />
                次にやること
                {dashboard.aiPowered && (
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
                    AI
                  </span>
                )}
              </h3>
              {dashboard.takeaways.map((t, i) => (
                <div key={i} className="buzz-list-item flex gap-3 !p-3">
                  <TakeawayIcon type={t.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-600">{t.body}</p>
                    {t.actionPath && t.actionLabel && (
                      <Link
                        to={t.actionPath}
                        className="mt-2 inline-block text-xs font-medium text-violet-700 underline-offset-2 hover:underline"
                      >
                        {t.actionLabel} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {lineOnly ? (
              <>
                <div className="buzz-card-pad !p-3">
                  <p className="text-[10px] text-neutral-500">友だち数</p>
                  <p className="buzz-stat-value text-lg">
                    {dashboard.lineFollowers != null
                      ? dashboard.lineFollowers.toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div className="buzz-card-pad !p-3">
                  <p className="text-[10px] text-neutral-500">LINE追加（CV）</p>
                  <p className="buzz-stat-value text-lg">{dashboard.totals.lineSignups}</p>
                </div>
              </>
            ) : (
              <>
                <div className="buzz-card-pad !p-3">
                  <p className="text-[10px] text-neutral-500">表示</p>
                  <p className="buzz-stat-value text-lg">
                    {dashboard.totals.impressions.toLocaleString()}
                  </p>
                </div>
                <div className="buzz-card-pad !p-3">
                  <p className="text-[10px] text-neutral-500">リーチ</p>
                  <p className="buzz-stat-value text-lg">{dashboard.totals.reach.toLocaleString()}</p>
                </div>
                <div className="buzz-card-pad !p-3">
                  <p className="text-[10px] text-neutral-500">反応</p>
                  <p className="buzz-stat-value text-lg">
                    {dashboard.totals.engagements.toLocaleString()}
                  </p>
                </div>
                <div className="buzz-card-pad !p-3">
                  <p className="text-[10px] text-neutral-500">投稿数</p>
                  <p className="buzz-stat-value text-lg">{dashboard.totals.postCount}</p>
                </div>
              </>
            )}
          </div>

          {(platform === 'all' || !lineOnly) && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="buzz-card-pad !p-3">
                <div className="mb-1 flex items-center gap-1 text-[10px] text-neutral-500">
                  <MousePointerClick className="h-3 w-3" />
                  クリック
                </div>
                <p className="text-lg font-bold tabular-nums">{dashboard.totals.clicks}</p>
              </div>
              <div className="buzz-card-pad !p-3">
                <div className="mb-1 flex items-center gap-1 text-[10px] text-neutral-500">
                  <Users className="h-3 w-3" />
                  LINE追加
                </div>
                <p className="text-lg font-bold tabular-nums">{dashboard.totals.lineSignups}</p>
              </div>
              <div className="buzz-card-pad !p-3">
                <p className="text-[10px] text-neutral-500">売上見込み</p>
                <p className="text-lg font-bold tabular-nums">
                  ¥{dashboard.totals.revenue.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {showSnsCharts && platformBars.length > 0 && (
            <div className="buzz-card-pad">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <BarChart3 className="h-4 w-4" />
                媒体別インプレッション
              </h3>
              <SimpleBarChart data={platformBars} height={compact ? 100 : 140} />
            </div>
          )}

          {showSnsCharts && lineSeries.some((d) => d.value > 0) && (
            <div className="buzz-card-pad">
              <SimpleLineChart data={lineSeries} label="表示数の推移（30日）" color="#171717" />
            </div>
          )}

          {showSnsCharts && engagementSeries.some((d) => d.value > 0) && !compact && (
            <div className="buzz-card-pad">
              <SimpleLineChart
                data={engagementSeries}
                label="エンゲージメントの推移"
                color="#E1306C"
              />
            </div>
          )}

          {showSnsCharts && dashboard.topPosts.length > 0 && (
            <div className="buzz-card-pad">
              <h3 className="mb-3 text-sm font-bold">投稿ランキング</h3>
              <ul className="divide-y divide-neutral-100">
                {dashboard.topPosts.slice(0, compact ? 3 : 8).map((post, i) => (
                  <li key={post.id} className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5 w-5 shrink-0 text-xs font-bold text-neutral-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-800">{post.preview}</p>
                      <p className="mt-0.5 text-[10px] text-neutral-500">
                        {PLATFORM_LABEL[post.platform] ?? post.platform}
                        {post.scheduledAt
                          ? ` · ${new Date(post.scheduledAt).toLocaleDateString('ja-JP')}`
                          : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums">
                        {post.impressions.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        反応 {post.engagement}
                        {post.engagementRate > 0 ? ` (${post.engagementRate}%)` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lineOnly && dashboard.lineFollowers == null && (
            <div className="buzz-card-pad text-sm text-neutral-600">
              LINE 公式アカウントを連携すると、友だち数がここに表示されます。
              <Link to="/settings?tab=sns" className="ml-1 text-violet-700 underline">
                設定へ
              </Link>
            </div>
          )}

          {showSnsCharts && dashboard.totals.postCount === 0 && (
            <div className="buzz-card-pad text-center text-sm text-neutral-600">
              まだ投稿データがありません。予約投稿または Xシリーズで投稿すると自動で集まります。
            </div>
          )}

          {(platform === 'all' || fbOnly) && dashboard.tiktok.publishedCount > 0 && (
            <div className="buzz-card-pad flex gap-3 text-sm">
              <FileText className="h-5 w-5 shrink-0 text-neutral-500" />
              <div>
                <p className="font-medium">TikTok 投稿 {dashboard.tiktok.publishedCount} 件</p>
                <p className="mt-1 text-xs text-neutral-500">{dashboard.tiktok.note}</p>
              </div>
            </div>
          )}
        </>
      )}

      {!dashboard && !analyzing && (
        <div className="buzz-card-pad text-center text-sm text-neutral-600">
          「解析を更新」を押すと、各SNSから最新データを取得してグラフを表示します。
        </div>
      )}
    </div>
  );
}
