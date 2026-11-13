import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { RefreshCw, Settings2, Wand2 } from 'lucide-react';
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
        label: s.metaConnected ? 'Meta 連携済み' : 'Meta 未連携',
      };
    case 'x':
      return {
        connected: !!s.xConnected,
        label: s.xConnected ? 'X 連携済み' : 'X 未連携',
      };
    case 'line':
      return {
        connected: !!s.lineChannelAccessToken?.trim(),
        label: s.lineChannelAccessToken?.trim() ? 'LINE 連携済み' : 'LINE 未連携',
      };
    case 'gbp':
      return {
        connected: !!(s.gbpConnected || s.gbpLocationName?.trim()),
        label: s.gbpConnected || s.gbpLocationName?.trim() ? 'GBP 設定済み' : 'GBP 未設定',
      };
    default:
      return { connected: false, label: '連携は準備中' };
  }
}

function insightsPlatformKey(platformId: string): string | undefined {
  if (platformId === 'instagram') return 'instagram';
  if (platformId === 'x') return 'x';
  if (platformId === 'facebook-threads') return 'facebook-threads';
  return undefined;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2 rounded-lg border border-neutral-200/80 bg-white px-3 py-1.5 shadow-sm">
      <span className="truncate text-sm text-neutral-600">{label}</span>
      <span className="text-xl font-bold tabular-nums text-neutral-900">{children}</span>
    </div>
  );
}

/**
 * SNS別ハブ: 予約投稿・予定カレンダーを媒体ごとに扱う入口。
 * 画面全幅・1画面に収まるレイアウト（タイトルはレイアウトのヘッダーに表示）。
 */
export default function SnsHubPage() {
  const { platformId = '' } = useParams<{ platformId: string }>();
  const sns = getSnsNavPlatform(platformId);
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
      .catch(() => setConn({ connected: false, label: '接続状態を取得できません' }));
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return { pending, draft, failed, done };
  }, [scoped]);

  if (!sns) {
    return <Navigate to="/calendar" replace />;
  }

  const canSyncInsights = platformId === 'instagram' || platformId === 'x' || platformId === 'facebook-threads';

  const impressionValue = !canSyncInsights
    ? '—'
    : insights == null
      ? '…'
      : platformId === 'x' && !insights.xInsightsEnabled
        ? 'オフ'
        : insights.postCount === 0
          ? '—'
          : insights.totalImpressions.toLocaleString();

  const btn =
    'inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 lg:gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Stat label="予約待ち">{stats.pending}</Stat>
        <Stat label="下書き">{stats.draft}</Stat>
        <Stat label="失敗">
          <span className={stats.failed > 0 ? 'text-red-600' : ''}>{stats.failed}</span>
        </Stat>
        <Stat label="完了">{stats.done}</Stat>
        <Stat label="インプレッション">
          <span className="inline-flex items-center gap-1.5">
            {impressionValue}
            {canSyncInsights && (
              <button
                type="button"
                disabled={syncing}
                title="今すぐ同期"
                className="text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
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
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </span>
        </Stat>
        {platformId === 'x' && insights && !insights.xInsightsEnabled && (
          <Link to={settingsPath({ section: 'insights' })} className="text-sm underline">
            取得を有効化
          </Link>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              conn.connected ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
            }`}
          >
            {conn.label}
          </span>
          {platformId === 'x' && (
            <Link to="/x-series" className={`${btn} border border-neutral-300 bg-white text-neutral-800`}>
              Xシリーズ
            </Link>
          )}
          <Link
            to={platformSettingsPath(platformId)}
            className={`${btn} border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50`}
          >
            <Settings2 className="h-4 w-4" />
            API・連携
          </Link>
          <Link
            to={`/magic-creator?sns=${encodeURIComponent(platformId)}`}
            className={`${btn} bg-neutral-900 text-white hover:bg-neutral-800`}
          >
            <Wand2 className="h-4 w-4" />
            ネタから作る
          </Link>
        </div>
      </div>

      <CalendarPage platformId={platformId} embedded />
    </div>
  );
}
