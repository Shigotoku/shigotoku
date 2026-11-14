import { MapPin } from 'lucide-react';
import { draftGbpReviewReply } from '../../../lib/api';
import { useSettings } from '../SettingsContext';


export default function GbpPanel() {
  const { setMessage, gbpConnected, setGbpConnected, gbpLocationName, setGbpLocationName, gbpReview, setGbpReview, gbpReply, setGbpReply, handleGbpConnect } = useSettings();
  return (
    <>
      <section id="settings-gbp" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <MapPin className="h-5 w-5 text-neutral-700" />
          Google Business Profile（GBP / Googleマップ）
        </h3>
        <p className="text-sm text-neutral-600">
          ロケーション名を保存すると GBP 投稿モードと口コミ返信ドラフトが使えます。
        </p>
        <label className="buzz-label">店舗ロケーション名</label>
        <input
          value={gbpLocationName}
          onChange={(e) => {
            setGbpLocationName(e.target.value);
            if (e.target.value.trim()) setGbpConnected(true);
          }}
          placeholder="例: BuzzIt渋谷店"
          className="buzz-input"
        />
        <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 p-4">
          <span>接続状態</span>
          <span className="text-xs">{gbpConnected || gbpLocationName ? '連携済み（手動）' : '未接続'}</span>
        </div>
        <button type="button" onClick={handleGbpConnect} className="buzz-btn-secondary">
          連携手順を確認
        </button>
        <label className="buzz-label">口コミ返信ドラフト</label>
        <textarea
          className="buzz-input h-20 resize-none"
          placeholder="届いた口コミを貼り付け"
          value={gbpReview}
          onChange={(e) => setGbpReview(e.target.value)}
        />
        <button
          type="button"
          className="buzz-btn-secondary"
          onClick={async () => {
            try {
              const r = await draftGbpReviewReply(gbpReview);
              setGbpReply(r.reply);
            } catch {
              setMessage('口コミ返信の生成に失敗しました');
            }
          }}
        >
          返信文を生成
        </button>
        {gbpReply && <pre className="whitespace-pre-wrap border border-neutral-200 bg-neutral-50 p-3 text-sm">{gbpReply}</pre>}
      </section>
    </>
  );
}
