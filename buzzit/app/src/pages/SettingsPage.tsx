import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Link2, MessageSquare, Zap, Save, BarChart3, Share2 } from 'lucide-react';
import { WATERMARK } from '../constants/brand';
import {
  fetchSettings,
  updateSettings,
  submitSlackIdea,
  fetchSlackIdeas,
  approveSlackIdea,
  runAutoMode,
  startMetaOAuth,
  type PublishMode,
} from '../lib/api';
import { useApp } from '../store/appContext';
import type { PlanTier } from '../types';

const plans: { id: PlanTier; name: string; price: string; features: string[] }[] = [
  { id: 'starter', name: 'Starter', price: '¥0', features: ['AI台本生成', 'SNS健康診断', `透かし付き（${WATERMARK}）`] },
  { id: 'pro', name: 'Pro', price: '¥4,980/月', features: ['全SNS自動予約', 'AI処方的提案', '透かし削除'] },
  { id: 'team', name: 'Team', price: '¥9,800/月', features: ['Slack連携（ネタ会議）', '戦略的通知（朝/昼/夜）', 'チーム承認フロー'] },
  { id: 'growth', name: 'Growth OS', price: '¥29,800/月', features: ['深い売上トラッキング', 'Auto Mode（完全自動運用）', 'アンバサダーCRM'] },
];

export default function SettingsPage() {
  const { plan, setPlan } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [ayrshareProfileKey, setAyrshareProfileKey] = useState('');
  const [slackTeamId, setSlackTeamId] = useState('');
  const [autoModeEnabled, setAutoModeEnabled] = useState(false);
  const [lineChannelSecret, setLineChannelSecret] = useState('');
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState('');
  const [lineDestinationId, setLineDestinationId] = useState('');
  const [defaultDestinationUrl, setDefaultDestinationUrl] = useState('');
  const [defaultPublishMode, setDefaultPublishMode] = useState<PublishMode>('notify');
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaTokenExpiresAt, setMetaTokenExpiresAt] = useState('');
  const [lineWebhookUrl, setLineWebhookUrl] = useState('');
  const [snsConnections, setSnsConnections] = useState<Array<{ name: string; connected: boolean }>>([]);
  const [slackIdeas, setSlackIdeas] = useState<Array<{ id: string; text: string; status: string; scriptPreview: string }>>([]);
  const [newIdea, setNewIdea] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setPlan(s.plan as PlanTier);
        setSlackWebhookUrl(s.slackWebhookUrl ?? '');
        setAyrshareProfileKey(s.ayrshareProfileKey ?? '');
        setSlackTeamId(s.slackTeamId ?? '');
        setAutoModeEnabled(!!s.autoModeEnabled);
        setLineChannelSecret(s.lineChannelSecret ?? '');
        setLineChannelAccessToken(s.lineChannelAccessToken ?? '');
        setLineDestinationId(s.lineDestinationId ?? '');
        setDefaultDestinationUrl(s.defaultDestinationUrl ?? '');
        setDefaultPublishMode(s.defaultPublishMode ?? 'notify');
        setMetaConnected(!!s.metaConnected);
        setMetaTokenExpiresAt(s.metaTokenExpiresAt ?? '');
        setLineWebhookUrl(s.lineWebhookUrl ?? '');
        setSnsConnections(s.snsConnections);
      })
      .catch(() => {});
    fetchSlackIdeas()
      .then((r) => setSlackIdeas(r.ideas))
      .catch(() => {});

    const metaStatus = searchParams.get('meta');
    if (metaStatus === 'connected') {
      setMessage('Meta（Instagram / Facebook）を連携しました');
      setSearchParams({}, { replace: true });
    } else if (metaStatus === 'error') {
      setMessage('Meta 連携に失敗しました。アプリ設定を確認してください');
      setSearchParams({}, { replace: true });
    } else if (metaStatus === 'expired') {
      setMessage('Meta 連携の有効期限が切れました。再度お試しください');
      setSearchParams({}, { replace: true });
    }
  }, [setPlan, searchParams, setSearchParams]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        plan,
        slackWebhookUrl,
        ayrshareProfileKey,
        slackTeamId,
        autoModeEnabled,
        lineChannelSecret,
        lineChannelAccessToken,
        lineDestinationId,
        defaultDestinationUrl,
        defaultPublishMode,
      });
      setMessage('設定を保存しました');
    } catch {
      setMessage('保存に失敗しました');
    }
    setSaving(false);
  };

  const handleSubmitIdea = async () => {
    if (!newIdea.trim()) return;
    try {
      await submitSlackIdea(newIdea);
      setNewIdea('');
      const r = await fetchSlackIdeas();
      setSlackIdeas(r.ideas);
      setMessage('Slack ネタを送信しました');
    } catch {
      setMessage('送信に失敗しました（Team プラン以上が必要な場合があります）');
    }
  };

  const handleAutoMode = async () => {
    try {
      const r = await runAutoMode();
      setMessage(`Auto Mode 実行: ${r.mission.title}`);
    } catch {
      setMessage('Auto Mode は Growth OS プランが必要です');
    }
  };

  const handleMetaConnect = async () => {
    try {
      const { url } = await startMetaOAuth();
      window.location.href = url;
    } catch {
      setMessage('Meta OAuth が未設定です。管理者に META_APP_ID を設定してもらってください');
    }
  };

  return (
    <div className="buzz-page-narrow">
      <div>
        <h2 className="mb-2 text-2xl font-bold">設定</h2>
        <p className="text-neutral-600">プラン・Meta / LINE / Slack 連携の管理</p>
      </div>

      {message && <p className="buzz-alert buzz-alert-info">{message}</p>}

      <section className="buzz-card-pad">
        <h3 className="mb-6 text-lg font-bold">プラン</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`border p-5 text-left transition-colors ${
                plan === p.id
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-400'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold">{p.name}</span>
                <span className="text-sm text-neutral-600">{p.price}</span>
              </div>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                    <Check className="h-3.5 w-3.5 shrink-0 text-neutral-800" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </section>

      <section className="buzz-card-pad space-y-4">
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

      <section className="buzz-card-pad space-y-4">
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
          <option value="meta">Meta 自動投稿（IG/FB/Threads）</option>
          <option value="line">LINE ブロードキャスト</option>
          <option value="auto">自動（接続状況に応じて最適化）</option>
          <option value="ayrshare">Ayrshare（レガシー・任意）</option>
        </select>
      </section>

      <section className="buzz-card-pad space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Link2 className="h-5 w-5 text-neutral-700" />
          Ayrshare（オプション）
        </h3>
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

      <section className="buzz-card-pad space-y-4">
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
        <div className="flex gap-2">
          <input
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            placeholder="ネタを入力（Slack 風テスト）"
            className="buzz-input flex-1"
          />
          <button type="button" onClick={handleSubmitIdea} className="buzz-btn-primary shrink-0">
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
                      onClick={() => approveSlackIdea(idea.id)}
                      className="text-xs text-neutral-700 underline-offset-2 hover:underline"
                    >
                      採用
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="buzz-card-pad space-y-4">
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

      <button type="button" onClick={handleSave} disabled={saving} className="buzz-btn-primary disabled:opacity-70">
        <Save className="h-4 w-4" />
        {saving ? '保存中...' : '設定を保存'}
      </button>
    </div>
  );
}
