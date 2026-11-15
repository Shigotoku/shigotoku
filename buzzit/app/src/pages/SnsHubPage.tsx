import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { RefreshCw, Settings2 } from 'lucide-react';
import { getSnsNavPlatform } from '../lib/snsPlatforms';
import { platformSettingsPath, settingsPath } from '../lib/settingsUrls';
import {
  fetchInsightsSummary,
  fetchSettings,
  syncInsights,
  type InsightsSummary,
} from '../lib/api';
import CalendarPage from './CalendarPage';
import { authFetch } from '../lib/api';
import SnsRulesBox from './SnsRulesBox';

const HUB_PLATFORMS: Record<string, string[]> = {
  x: ['x_thread'], instagram: ['instagram'], tiktok: ['tiktok'], 'facebook-threads': ['facebook', 'threads'],
  'youtube-shorts': ['youtube_shorts'], line: ['line'], gbp: ['gbp'],
};

/** この媒体の投稿候補(ネタ)を一覧。詳細・予約は「投稿候補」ページで行う */
function HubCandidates({ platformId }: { platformId: string }) {
  const [rows, setRows] = useState<Array<{ id: string; title: string; body: string; status: string; selection: string }>>([]);
  const [total, setTotal] = useState(0);
  const keys = HUB_PLATFORMS[platformId] ?? [];
  useEffect(() => {
    if (!keys.length) return;
    authFetch(`/v1/candidates?platform=&status=candidate`)
      .then((r) => r.json())
      .then((j) => { setRows(j.candidates ?? []); setTotal(j.total ?? 0); })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId]);
  if (!keys.length) return null;
  return (
    <details className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold">この媒体の投稿候補(ネタ){total}件 <span className="font-normal text-neutral-500">まだ予約していないもの</span></summary>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {rows.slice(0, 30).map((r) => (
          <li key={r.id}><Link to={`/candidates?platform=`} className="block truncate rounded px-2 py-1 hover:bg-neutral-50">{r.title || r.body.slice(0, 50)}</Link></li>
        ))}
        {rows.length === 0 && <li className="text-neutral-500">候補はありません。投稿候補ページでネタを追加できます。</li>}
      </ul>
      <Link to={`/candidates?platform=`} className="mt-2 inline-block text-xs underline">投稿候補ページで開く(予約・重複チェック)</Link>
    </details>
  );
}

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

/**
 * SNS別ハブ: 左にカレンダー、右に作成・履歴・予定・下書きを切り替える1画面。
 * 画面全幅・1画面に収まるレイアウト（タイトルはレイアウトのヘッダーに表示）。
 */
export default function SnsHubPage() {
  const { platformId = '' } = useParams<{ platformId: string }>();
  const sns = getSnsNavPlatform(platformId);
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
    fetchSettings()
      .then((s) => setConn(connectionLabel(platformId, s)))
      .catch(() => setConn({ connected: false, label: '接続状態を取得できません' }));
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId]);

  if (!sns) {
    return <Navigate to="/calendar" replace />;
  }

  const canSyncInsights = platformId === 'instagram' || platformId === 'x' || platformId === 'facebook-threads';
  const xInsightsOff = platformId === 'x' && insights != null && !insights.xInsightsEnabled;
  const showImpressions = canSyncInsights && insights != null && !xInsightsOff && insights.postCount > 0;

  const link =
    'inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 lg:gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            conn.connected ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
          }`}
        >
          {conn.label}
        </span>
        {!conn.connected && (
          <Link to={platformSettingsPath(platformId)} className="text-sm underline underline-offset-2">
            連携する
          </Link>
        )}
        {showImpressions && (
          <span className="inline-flex items-center gap-1.5 text-sm text-neutral-600">
            インプレッション
            <strong className="tabular-nums text-neutral-900">{insights!.totalImpressions.toLocaleString()}</strong>
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
          </span>
        )}
        {xInsightsOff && (
          <Link to={settingsPath({ section: 'insights' })} className="text-sm underline underline-offset-2">
            インプレッション取得を有効化
          </Link>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {platformId === 'x' && (
            <Link to="/x-series" className={link}>
              Xシリーズ
            </Link>
          )}
          <Link to={platformSettingsPath(platformId)} className={link}>
            <Settings2 className="h-4 w-4" />
            API・連携
          </Link>
        </div>
      </div>

      <SnsRulesBox ruleId={platformId} />
      <HubCandidates platformId={platformId} />
      <CalendarPage platformId={platformId} embedded />
    </div>
  );
}