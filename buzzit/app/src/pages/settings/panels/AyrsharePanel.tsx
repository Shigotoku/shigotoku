import { Link2 } from 'lucide-react';
import { useSettings } from '../SettingsContext';


export default function AyrsharePanel() {
  const { ayrshareProfileKey, setAyrshareProfileKey, snsConnections } = useSettings();
  return (
    <>
      <section id="settings-ayrshare" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Link2 className="h-5 w-5 text-neutral-700" />
          Ayrshare（オプション）
        </h3>
        <p className="text-sm text-neutral-600">
          Ayrshare は外部の投稿予約サービスです。X は上記「X API 連携」または通知＋コピーが標準です。
          プロファイルキーを入れると Instagram / X / TikTok などの接続状態を確認でき、投稿モード「Ayrshare」でも予約できます。
        </p>
        <div className="space-y-3">
          {snsConnections.map((sns) => (
            <div
              key={sns.name}
              className="flex items-center justify-between border border-neutral-200 bg-neutral-50 p-4"
            >
              <span>{sns.name}</span>
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  sns.connected
                    ? 'border border-neutral-300 bg-white text-neutral-800'
                    : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {sns.connected ? '接続済み' : '未接続'}
              </span>
            </div>
          ))}
        </div>
        <label className="buzz-label">Ayrshare プロファイルキー</label>
        <input
          value={ayrshareProfileKey}
          onChange={(e) => setAyrshareProfileKey(e.target.value)}
          placeholder="Profile-Key（任意）"
          className="buzz-input"
        />
      </section>
    </>
  );
}
