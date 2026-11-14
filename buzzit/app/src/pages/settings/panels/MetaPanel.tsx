import { Share2 } from 'lucide-react';
import { useSettings } from '../SettingsContext';


export default function MetaPanel() {
  const { metaConnected, metaTokenExpiresAt, handleMetaConnect } = useSettings();
  return (
    <>
      <section id="settings-meta" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Share2 className="h-5 w-5 text-neutral-700" />
          Meta 連携（Instagram / Facebook / Threads）
        </h3>
        <p className="text-sm text-neutral-600">
          店舗の Meta アカウントで OAuth 連携します。連携後、予約時刻に Graph API で自動投稿できます。
        </p>
        <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 p-4">
          <span>Instagram Business</span>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              metaConnected
                ? 'border border-neutral-300 bg-white text-neutral-800'
                : 'bg-neutral-200 text-neutral-600'
            }`}
          >
            {metaConnected ? '接続済み' : '未接続'}
          </span>
        </div>
        {metaTokenExpiresAt && (
          <p className="text-xs text-neutral-500">トークン期限: {new Date(metaTokenExpiresAt).toLocaleString('ja-JP')}</p>
        )}
        <button type="button" onClick={handleMetaConnect} className="buzz-btn-secondary">
          {metaConnected ? 'Meta を再連携' : 'Meta で連携する'}
        </button>
      </section>
    </>
  );
}
