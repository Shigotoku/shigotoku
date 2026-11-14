import { Sparkles } from 'lucide-react';
import { useSettings } from '../SettingsContext';


export default function HpbPanel() {
  const { hpbStoreUrl, setHpbStoreUrl, notifyEmail, setNotifyEmail } = useSettings();
  return (
    <>
      <section id="settings-hpb" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-5 w-5 text-neutral-700" />
          ホットペッパービューティー（HPB）トラッキング
        </h3>
        <p className="text-sm text-neutral-600">
          店舗URLを保存すると、投稿クリック・LINE追加から予約寄与を推計表示します。
        </p>
        <label className="buzz-label">HPB 店舗 URL</label>
        <input
          value={hpbStoreUrl}
          onChange={(e) => setHpbStoreUrl(e.target.value)}
          placeholder="https://beauty.hotpepper.jp/slnH000000000/"
          className="buzz-input"
        />
        <label className="buzz-label">店長通知メール（将来拡張・現状はSlack/LINE優先）</label>
        <input
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          placeholder="owner@example.com"
          className="buzz-input"
        />
      </section>
    </>
  );
}
