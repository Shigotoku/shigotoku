import { Link2 } from 'lucide-react';
import { type PublishMode } from '../../../lib/api';
import { useSettings } from '../SettingsContext';


export default function PublishModePanel() {
  const { defaultPublishMode, setDefaultPublishMode } = useSettings();
  return (
    <>
      <section id="settings-publish-mode" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Link2 className="h-5 w-5 text-neutral-700" />
          投稿モード（デフォルト）
        </h3>
        <select
          value={defaultPublishMode}
          onChange={(e) => setDefaultPublishMode(e.target.value as PublishMode)}
          className="buzz-input"
        >
          <option value="notify">通知リマインダー（Slack/LINE に文案送信・半自動）</option>
          <option value="approval">承認後投稿（ダッシュボードで承認）</option>
          <option value="x_free">X API 自動投稿（BYOK）</option>
          <option value="meta">Meta 自動投稿（IG/FB/Threads）</option>
          <option value="line">LINE ブロードキャスト</option>
          <option value="gbp">Google Business Profile（Phase 4）</option>
          <option value="auto">自動（接続状況に応じて最適化）</option>
          <option value="ayrshare">Ayrshare（レガシー・任意）</option>
        </select>
      </section>
    </>
  );
}
