import { BarChart3 } from 'lucide-react';
import { useSettings } from '../SettingsContext';


export default function LinePanel() {
  const { lineChannelSecret, setLineChannelSecret, lineChannelAccessToken, setLineChannelAccessToken, lineDestinationId, setLineDestinationId, defaultDestinationUrl, setDefaultDestinationUrl, lineWebhookUrl } = useSettings();
  return (
    <>
      <section id="settings-line" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <BarChart3 className="h-5 w-5 text-neutral-700" />
          売上トラッキング（UTM / LINE）
        </h3>
        <p className="text-sm text-neutral-600">
          投稿からのクリックと LINE 友だち追加を自動計測します。予約投稿時に計測リンクが自動生成されます。
        </p>
        <label className="buzz-label">リダイレクト先 URL（店舗サイト・予約ページ等）</label>
        <input
          value={defaultDestinationUrl}
          onChange={(e) => setDefaultDestinationUrl(e.target.value)}
          placeholder="https://example.com/reserve"
          className="buzz-input"
        />
        <label className="buzz-label">LINE Channel Access Token（配信・通知用）</label>
        <input
          value={lineChannelAccessToken}
          onChange={(e) => setLineChannelAccessToken(e.target.value)}
          placeholder="Messaging API Channel Access Token"
          type="password"
          autoComplete="off"
          className="buzz-input"
        />
        <label className="buzz-label">LINE Channel Secret</label>
        <input
          value={lineChannelSecret}
          onChange={(e) => setLineChannelSecret(e.target.value)}
          placeholder="LINE Developers で取得"
          type="password"
          autoComplete="off"
          className="buzz-input"
        />
        <label className="buzz-label">LINE Destination ID（Webhook の destination 値）</label>
        <input
          value={lineDestinationId}
          onChange={(e) => setLineDestinationId(e.target.value)}
          placeholder="Uxxxxxxxx..."
          className="buzz-input"
        />
        {lineWebhookUrl && (
          <div className="border border-neutral-200 bg-neutral-50 p-4">
            <p className="mb-2 text-xs text-neutral-500">LINE Webhook URL（Messaging API に設定）</p>
            <code className="block break-all text-xs text-neutral-800">{lineWebhookUrl}</code>
          </div>
        )}
      </section>
    </>
  );
}
