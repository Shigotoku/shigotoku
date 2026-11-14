import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { useSettings } from '../SettingsContext';


export default function XPanel() {
  const { xConnected, xUsername, xApiPostsThisMonth, xApiMonthlyLimit, xApiKey, setXApiKey, xApiSecret, setXApiSecret, xAccessToken, setXAccessToken, xAccessSecret, setXAccessSecret, xTesting, handleXTestAndSave, handleXDisconnect } = useSettings();
  return (
    <>
      <section id="settings-x" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Share2 className="h-5 w-5 text-neutral-700" />
          X（旧Twitter）API 連携
        </h3>
        <p className="text-sm text-neutral-600">
          ご自身の X Developer アプリのキー（Read and Write）を登録すると、予約時刻に公式 API で自動投稿できます。
          鍵はサーバーのみに保存し、画面には再表示しません。自アカウントへの投稿用途向けです。
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <p className="text-sm font-medium">
              {xConnected ? `接続済み${xUsername ? ` (@${xUsername})` : ''}` : '未接続'}
            </p>
            <p className="text-xs text-neutral-500">
              今月の投稿: {xApiPostsThisMonth} / {xApiMonthlyLimit}（ソフト上限・開発者枠に準拠）
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              xConnected
                ? 'border border-neutral-300 bg-white text-neutral-800'
                : 'bg-neutral-200 text-neutral-600'
            }`}
          >
            {xConnected ? '接続済み' : '未接続'}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="buzz-label">API Key</label>
            <input
              value={xApiKey}
              onChange={(e) => setXApiKey(e.target.value)}
              placeholder={xConnected ? '変更する場合のみ入力' : 'API Key'}
              className="buzz-input"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="buzz-label">API Secret</label>
            <input
              type="password"
              value={xApiSecret}
              onChange={(e) => setXApiSecret(e.target.value)}
              placeholder={xConnected ? '変更する場合のみ入力' : 'API Secret'}
              className="buzz-input"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="buzz-label">Access Token</label>
            <input
              value={xAccessToken}
              onChange={(e) => setXAccessToken(e.target.value)}
              placeholder={xConnected ? '変更する場合のみ入力' : 'Access Token'}
              className="buzz-input"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="buzz-label">Access Token Secret</label>
            <input
              type="password"
              value={xAccessSecret}
              onChange={(e) => setXAccessSecret(e.target.value)}
              placeholder={xConnected ? '変更する場合のみ入力' : 'Access Token Secret'}
              className="buzz-input"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={xTesting}
            onClick={handleXTestAndSave}
            className="buzz-btn-primary disabled:opacity-60"
          >
            {xTesting ? '確認中...' : xConnected ? '再接続テスト' : '接続テストして保存'}
          </button>
          {xConnected && (
            <button type="button" onClick={handleXDisconnect} className="buzz-btn-secondary">
              連携解除
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-500">
          Developer Portal で App permissions を Read and Write にし、ユーザートークンを発行してください。
          いいね・フォロー自動化などは行いません（投稿のみ）。料金・枠は X の開発者プランに従います。
        </p>
        <Link to="/x-series" className="inline-block text-sm underline-offset-2 hover:underline">
          Xシリーズ（曜日キュー）の管理へ →
        </Link>
      </section>
    </>
  );
}
