import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BarChart3, CalendarDays, Settings2, Wand2 } from 'lucide-react';
import { getPlatformCompanion } from '../data/platformCompanions';
import { getSnsNavPlatform, jobMatchesSnsPlatform } from '../lib/snsPlatforms';
import { fetchScheduledJobs, fetchSettings, type ScheduledJob } from '../lib/api';
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

  useEffect(() => {
    fetchScheduledJobs()
      .then((r) => setJobs(r.jobs))
      .catch(() => setJobs([]));
    fetchSettings()
      .then((s) => setConn(connectionLabel(platformId, s)))
      .catch(() => setConn({ connected: false, label: '接続状態を取得できませんでした' }));
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

  return (
    <div className="buzz-page space-y-6">
      <section className="border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">SNS</p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-neutral-900">{sns.name}</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600">
              {companion?.priorityNote ??
                'この媒体の投稿内容・予約予定・カレンダーをまとめて管理します。'}
            </p>
            <p className={`mt-2 text-xs font-medium ${conn.connected ? 'text-emerald-700' : 'text-amber-800'}`}>
              {conn.label}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/magic-creator?sns=${encodeURIComponent(platformId)}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 border border-neutral-900 bg-neutral-900 px-3 text-sm font-medium text-white"
            >
              <Wand2 className="h-4 w-4" />
              ネタから作る
            </Link>
            {platformId === 'x' && (
              <Link
                to="/x-series"
                className="inline-flex min-h-[44px] items-center gap-1.5 border border-neutral-300 px-3 text-sm"
              >
                Xシリーズキュー
              </Link>
            )}
            <Link
              to="/settings?tab=sns"
              className="inline-flex min-h-[44px] items-center gap-1.5 border border-neutral-300 px-3 text-sm"
            >
              <Settings2 className="h-4 w-4" />
              API・連携
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-neutral-200 bg-[#f5f4f0] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <CalendarDays className="h-3.5 w-3.5" />
              予約・承認待ち
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{stats.pending}</p>
          </div>
          <div className="border border-neutral-200 bg-[#f5f4f0] p-3">
            <div className="text-xs font-medium text-neutral-500">下書き</div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{stats.draft}</p>
          </div>
          <div className="border border-neutral-200 bg-[#f5f4f0] p-3">
            <div className="text-xs font-medium text-neutral-500">失敗 / 完了</div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {stats.failed}
              <span className="text-base font-normal text-neutral-400"> / {stats.done}</span>
            </p>
          </div>
          <div className="border border-dashed border-neutral-300 bg-[#f5f4f0] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <BarChart3 className="h-3.5 w-3.5" />
              インプレッション
            </div>
            <p className="mt-1 text-sm text-neutral-600">
              API からの自動取得は準備中。予約件数 {stats.total} 件をこの画面で管理できます。
            </p>
          </div>
        </div>
      </section>

      <CalendarPage platformId={platformId} embedded />
    </div>
  );
}
