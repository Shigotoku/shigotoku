import { BarChart3 } from 'lucide-react';
import { updateSettings, syncInsights } from '../../../lib/api';
import { useSettings } from '../SettingsContext';


export default function InsightsPanel() {
  const { setMessage, insightsEnabled, setInsightsEnabled, xInsightsEnabled, setXInsightsEnabled, insightsLastSyncedAt, setInsightsLastSyncedAt, insightsSyncing, setInsightsSyncing } = useSettings();
  return (
    <>
      <section id="settings-insights" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <BarChart3 className="h-5 w-5 text-neutral-700" />
          インプレッション自動取得
        </h3>
        <p className="text-sm text-neutral-600">
          投稿済みの外部IDから Meta / X の表示回数を定期取得します。Meta は再連携で
          insights 権限が必要です。X の読み取りは従量課金になる可能性があるため、既定オフです（追加費用プランは別途検討）。
        </p>
        <label className="flex items-start gap-3 border border-neutral-200 bg-neutral-50 p-4">
          <input
            type="checkbox"
            className="mt-1"
            checked={insightsEnabled}
            onChange={(e) => setInsightsEnabled(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">インサイト同期を有効にする</span>
            <span className="text-xs text-neutral-500">Instagram 等（Meta）の views / reach を朝・昼・夜に同期</span>
          </span>
        </label>
        <label className="flex items-start gap-3 border border-amber-200 bg-amber-50/60 p-4">
          <input
            type="checkbox"
            className="mt-1"
            checked={xInsightsEnabled}
            onChange={(e) => setXInsightsEnabled(e.target.checked)}
            disabled={!insightsEnabled}
          />
          <span>
            <span className="block text-sm font-medium">X インサイト取得（費用ガード）</span>
            <span className="text-xs text-neutral-600">
              impression_count の読み取り。API クレジット消費の可能性があるため、明示オン時のみ取得します。
            </span>
          </span>
        </label>
        {insightsLastSyncedAt && (
          <p className="text-xs text-neutral-500">
            最終同期: {new Date(insightsLastSyncedAt).toLocaleString('ja-JP')}
          </p>
        )}
        <button
          type="button"
          disabled={insightsSyncing || !insightsEnabled}
          className="buzz-btn-secondary disabled:opacity-60"
          onClick={async () => {
            setInsightsSyncing(true);
            try {
              await updateSettings({ insightsEnabled, xInsightsEnabled });
              const r = await syncInsights(true);
              setInsightsLastSyncedAt(r.summary.lastSyncedAt ?? new Date().toISOString());
              setMessage(
                `同期完了: 取得 ${String(r.result.fetched ?? 0)} / スキップ ${String(r.result.skipped ?? 0)} / エラー ${String(r.result.errors ?? 0)}`,
              );
            } catch {
              setMessage('インサイト同期に失敗しました');
            }
            setInsightsSyncing(false);
          }}
        >
          {insightsSyncing ? '同期中…' : '今すぐ同期'}
        </button>
      </section>
    </>
  );
}
