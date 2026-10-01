import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BarChart3, CalendarDays, RefreshCw, Settings2, Wand2 } from 'lucide-react';
import { getPlatformCompanion } from '../data/platformCompanions';
import { getSnsNavPlatform, jobMatchesSnsPlatform } from '../lib/snsPlatforms';
import { platformSettingsPath, settingsPath } from '../lib/settingsUrls';
import {
  fetchInsightsSummary,
  fetchScheduledJobs,
  fetchSettings,
  syncInsights,
  type InsightsSummary,
  type ScheduledJob,
} from '../lib/api';
import CalendarPage from './CalendarPage';

function connectionLabel(platformId: string, s: {
  metaConnected?: boolean;
  xConnected?: boolean;
  lineChannelAccessToken?: string;
  gbpConnected?: boolean;
  gbpLocationName?: string;
}): { connected: boolean; label: string } {
  switch (platformId) {
    case 'instagram':
    case 'facebook-threads':
      return {
        connected: !!s.metaConnected,
        label: s.metaConnected ? 'Meta 連携済み' : '未連携（設定で Meta を接続）',
      };
    case 'x':
      return {
        connected: !!s.xConnected,
        label: s.xConnected ? 'X API 連携済み' : '未連携（設定で X BYOK）',
      };
    case 'line':
      return {
        connected: !!s.lineChannelAccessToken?.trim(),
        label: s.lineChannelAccessToken?.trim() ? 'LINE 連携済み' : '未連携（設定でトークン）',
      };
    case 'gbp':
      return {
        connected: !!(s.gbpConnected || s.gbpLocationName?.trim()),
        label: s.gbpConnected || s.gbpLocationName?.trim() ? 'GBP 設定済み' : '未設定',
      };
    default:
      return { connected: false, label: 'インサイト連携は準備中（予約は利用可）' };
  }
}

function insightsPlatformKey(platformId: string): string | undefined {
  if (platformId === 'instagram') return 'instagram';
  if (platformId === 'x') return 'x';
  if (platformId === 'facebook-threads') return 'facebook-threads';
  return undefined;
}

/**
 * SNS別ハブ: 予約投稿・予定カレンダーを媒体ごとに扱う入口。
 * 既存の CalendarPage / Xシリーズ / 設定を再利用する。
 */
export default function SnsHubPage() {
  const { platformId = '' } = useParams<{ platformId: string }>();
  const sns = getSnsNavPlatform(platformId);
  const companion = getPlatformCompanion(platformId);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [conn, setConn] = useState({ connected: false, label: '確認中…' });
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadInsights = () => {
    const key = insightsPlatformKey(platformId);
    if (!key) {
      setInsights(null);
      return;
    }
    fetchInsightsSummary(key)
      .then((r) => setInsights(r.summary))
      .catch(() => setInsights(null));
  };

  useEffect(() => {
    fetchScheduledJobs()
      .then((r) => setJobs(r.jobs))
      .catch(() => setJobs([]));
    fetchSettings()
      .then((s) => setConn(connectionLabel(platformId, s)))
      .catch(() => setConn({ connected: false, label: '接続状態を取得できませんでした' }));
    loadInsights();
  }, [platformId]);

  const scoped = useMemo(
    () => (platformId ? jobs.filter((j) => jobMatchesSnsPlatform(j, platformId)) : []),
    [jobs, platformId],
  );

  const stats = useMemo(() => {
    const pending = scoped.filter((j) => j.status === 'pending' || j.status === 'pending_approval').length;
    const draft = scoped.filter((j) => j.status === 'draft').length;
    const failed = scoped.filter((j) => j.status === 'failed').length;
    const done = scoped.filter((j) => j.status === 'published' || j.status === 'notified').length;
    return { pending, draft, failed, done, total: scoped.length };
  }, [scoped]);

  if (!sns) {
    return <Navigate to="/calendar" replace />;
  }

  const canSyncInsights = platformId === 'instagram' || platformId === 'x' || platformId === 'facebook-threads';

  return (
    <div className="buzz-page space-y-6">
      <section className="buzz-platform-header overflow-hidden">
        <div className="px-4 py-4 sm:px-5 sm:py-5" style={{ background: sns.brandGradient }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/80">SNS · {sns.shortLabel}</p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white">{sns.name}</h2>
            <p className="mt-1 max-w-2xl text-sm text-white/90">
              {companion?.priorityNote ??
                'この媒体の投稿内容・予約予定・カレンダーをまとめて管理します。'}
            </p>
            <p className={`mt-2 text-xs font-medium ${conn.connected ? 'text-emerald-200' : 'text-amber-200'}`}>
              {conn.label}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/magic-creator?sns=${encodeURIComponent(platformId)}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-100"
            >
              <Wand2 className="h-4 w-4" />
              ネタから作る
            </Link>
            {platformId === 'x' && (
              <Link
                to="/x-series"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 text-sm text-white hover:bg-white/15"
              >
                Xシリーズキュー
              </Link>
            )}
            <Link
              to={platformSettingsPath(platformId)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/30 px-3 text-sm text-white hover:bg-white/10"
            >
              <Settings2 className="h-4 w-4" />
              API・連携
            </Link>
          </div>
        </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <CalendarDays className="h-3.5 w-3.5" />
              予約・承認待ち
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{stats.pending}</p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <div className="text-xs font-medium text-neutral-500">下書き</div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{stats.draft}</p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <div className="text-xs font-medium text-neutral-500">失敗 / 完了</div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {stats.failed}
              <span className="text-base font-normal text-neutral-400"> / {stats.done}</span>
            </p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-neutral-500">
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" />
                インプレッション
              </span>
              {canSyncInsights && (
                <button
                  type="button"
                  disabled={syncing}
                  title="今すぐ同期"
                  className="inline-flex items-center gap-1 text-neutral-700 disabled:opacity-50"
                  onClick={async () => {
                    setSyncing(true);
                    try {
                      await syncInsights(true);
                      loadInsights();
                    } catch {
                      /* ignore */
                    }
                    setSyncing(false);
                  }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            {!canSyncInsights ? (
              <p className="mt-1 text-sm text-neutral-600">この媒体の自動取得は未対応です。</p>
            ) : insights == null ? (
              <p className="mt-1 text-sm text-neutral-600">読み込み中…</p>
            ) : platformId === 'x' && !insights.xInsightsEnabled ? (
              <p className="mt-1 text-sm text-amber-900">
                X 取得は費用ガードでオフ。
                <Link to={settingsPath({ section: 'insights' })} className="ml-1 underline">
                  設定で有効化
                </Link>
              </p>
            ) : insights.postCount === 0 ? (
              <p className="mt-1 text-sm text-neutral-600">
                まだデータがありません。自動投稿済みの投稿から同期されます。
              </p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {insights.totalImpressions.toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {insights.postCount} 投稿
                  {insights.totalReach > 0 ? ` · リーチ ${insights.totalReach.toLocaleString()}` : ''}
                  {insights.lastSyncedAt
                    ? ` · ${new Date(insights.lastSyncedAt).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : ''}
                </p>
              </>
            )}
          </div>
        </div>

        {insights && insights.recent.length > 0 && canSyncInsights && (
          <ul className="mt-4 divide-y divide-neutral-100 border border-neutral-200">
            {insights.recent.slice(0, 5).map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-neutral-800">{row.preview || row.externalId}</p>
                  {row.lastError ? (
                    <p className="text-xs text-amber-800">{row.lastError}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      {row.scheduledAt
                        ? new Date(row.scheduledAt).toLocaleString('ja-JP', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-medium tabular-nums text-neutral-900">
                  {(row.impressions || 0).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CalendarPage platformId={platformId} embedded />
    </div>
  );
}
