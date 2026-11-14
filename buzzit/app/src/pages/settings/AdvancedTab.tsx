import { Zap, Users } from 'lucide-react';
import { fetchConnectionHealth, fetchAuditLogs, fetchExportJson, downloadExport, fetchStoresProgress } from '../../lib/api';
import LineCostComparison from '../../components/LineCostComparison';
import { useSettings } from './SettingsContext';


export default function AdvancedTab() {
  const { autoModeEnabled, setAutoModeEnabled, setMessage, lineCost, customerTags, handleAutoMode } = useSettings();
  return (
    <>
      <section className="buzz-card-pad space-y-4">
        <h3 className="text-lg font-bold">接続ヘルス / バックアップ / 操作ログ</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="buzz-btn-secondary"
            onClick={async () => {
              const h = await fetchConnectionHealth();
              setMessage(`接続ヘルス ${h.score}% — 注意 ${h.alerts.length} 件`);
            }}
          >
            ヘルスチェック
          </button>
          <button
            type="button"
            className="buzz-btn-secondary"
            onClick={async () => {
              const data = await fetchExportJson();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'buzzit-export.json';
              a.click();
              URL.revokeObjectURL(url);
              setMessage('バックアップJSONをダウンロードしました');
            }}
          >
            JSONエクスポート
          </button>
          <button
            type="button"
            className="buzz-btn-secondary"
            onClick={async () => {
              const csv = await downloadExport('csv');
              const blob = new Blob([String(csv)], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'buzzit-friends.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            友だちCSV
          </button>
          <button
            type="button"
            className="buzz-btn-secondary"
            onClick={async () => {
              const r = await fetchAuditLogs();
              setMessage(`操作ログ最新: ${r.logs[0]?.action ?? 'なし'} ${r.logs[0]?.detail ?? ''}`);
            }}
          >
            最新操作ログ
          </button>
          <button
            type="button"
            className="buzz-btn-secondary"
            onClick={async () => {
              const r = await fetchStoresProgress();
              const summary = r.stores
                .map((s) => `${s.name}:${s.progress?.lineConnected ? 'LINE済' : 'LINE未'}`)
                .join(' / ');
              setMessage(summary || '店舗がありません');
            }}
          >
            多店舗進捗
          </button>
        </div>
      </section>

      <section className="buzz-card-pad space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Users className="h-5 w-5 text-neutral-700" />
          LINE セグメント配信（Pro / Growth OS）
        </h3>
        <p className="text-sm text-neutral-600">
          2026年秋の LINE 料金改定で配信コストが最大1.91倍に。「真に必要な顧客にだけ」配信する戦略へ移行しましょう。
        </p>
        <LineCostComparison estimate={lineCost} />
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">顧客タグ</p>
          <div className="flex flex-wrap gap-2">
            {customerTags.length === 0 ? (
              <p className="text-sm text-neutral-500">
                タグはまだありません。Phase 5 で来店履歴・興味タグの自動生成が有効化されます。
              </p>
            ) : (
              customerTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: tag.color }} />
                  {tag.name}
                  <span className="text-neutral-500">{tag.friendCount}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="buzz-card-pad space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Zap className="h-5 w-5 text-neutral-700" />
          Auto Mode（Growth OS）
        </h3>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={autoModeEnabled}
            onChange={(e) => setAutoModeEnabled(e.target.checked)}
            className="h-4 w-4 rounded accent-neutral-900"
          />
          <span className="text-sm">毎朝 Auto Mode を自動実行（Cloud Scheduler）</span>
        </label>
        <button type="button" onClick={handleAutoMode} className="buzz-btn-secondary">
          今すぐ Auto Mode を実行
        </button>
      </section>
    </>
  );
}
