import { MessageSquare } from 'lucide-react';
import { approveSlackIdea } from '../../../lib/api';
import { useSettings } from '../SettingsContext';


export default function SlackPanel() {
  const { navigate, slackWebhookUrl, setSlackWebhookUrl, slackTeamId, setSlackTeamId, slackIdeas, setSlackIdeas, newIdea, setNewIdea, handleSubmitIdea } = useSettings();
  return (
    <>
      <section id="settings-slack" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <MessageSquare className="h-5 w-5 text-neutral-700" />
          Slack 連携（Team 以上）
        </h3>
        <label className="buzz-label">Incoming Webhook URL</label>
        <input
          value={slackWebhookUrl}
          onChange={(e) => setSlackWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="buzz-input"
        />
        <label className="buzz-label">Slack Team ID（Events API 用）</label>
        <input
          value={slackTeamId}
          onChange={(e) => setSlackTeamId(e.target.value)}
          placeholder="T01234567"
          className="buzz-input"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            placeholder="ネタを入力（Slack 風テスト）"
            className="buzz-input flex-1"
          />
          <button type="button" onClick={handleSubmitIdea} className="buzz-btn-primary shrink-0 w-full sm:w-auto">
            送信
          </button>
        </div>
        {slackIdeas.length > 0 && (
          <div className="mt-4 space-y-2">
            {slackIdeas.slice(0, 5).map((idea) => (
              <div key={idea.id} className="border border-neutral-200 bg-neutral-50 p-3 text-sm">
                <p className="text-neutral-800">{idea.text}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">{idea.status}</span>
                  {idea.status === 'pending' && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const r = await approveSlackIdea(idea.id);
                          setSlackIdeas((prev) =>
                            prev.map((i) => (i.id === idea.id ? { ...i, status: 'approved' } : i)),
                          );
                          navigate(r.magicCreatorPath || `/magic-creator?idea=${encodeURIComponent(idea.text)}`);
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="text-xs text-neutral-700 underline-offset-2 hover:underline"
                    >
                      採用してクリエイターへ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
