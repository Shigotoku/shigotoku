import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Link2, MessageSquare, Zap, Save, BarChart3, Share2, MapPin, Sparkles, Users } from 'lucide-react';
import { WATERMARK } from '../constants/brand';
import {
  fetchSettings,
  fetchSnsConnections,
  updateSettings,
  submitSlackIdea,
  fetchSlackIdeas,
  approveSlackIdea,
  runAutoMode,
  startMetaOAuth,
  startGbpOAuth,
  fetchLineCostEstimate,
  fetchCustomerTags,
  draftGbpReviewReply,
  fetchConnectionHealth,
  fetchAuditLogs,
  fetchExportJson,
  downloadExport,
  fetchStoresProgress,
  type PublishMode,
  type LineCostEstimate,
  type CustomerTag,
} from '../lib/api';
import LineCostComparison from '../components/LineCostComparison';
import StoreBillingSection from '../components/StoreBillingSection';
import { useApp } from '../store/appContext';
import type { PlanTier } from '../types';

const lineCrmPlans: { id: PlanTier; name: string; price: string; tagline: string; features: string[]; promo?: string }[] = [
  {
    id: 'line_lite',
    name: 'LINE CRM Lite',
    price: '¥500/月',
    promo: '初回3ヶ月 → 以降 ¥980',
    tagline: 'LINEだけ・小規模',
    features: ['ブロードキャスト', 'タグ〜10', '流入〜3', '友だち500まで'],
  },
  {
    id: 'line_pro',
    name: 'LINE CRM Pro',
    price: '¥4,980/月',
    tagline: 'Lステップ Standard 代替',
    features: ['Liteの全機能', 'セグメント配信', 'ステップ〜3', 'リッチメニュー5', '配信コスト試算'],
  },
];

const fullStackPlans: { id: PlanTier; name: string; price: string; tagline: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free',
    price: '¥0',
    tagline: 'まず5分体験',
    features: ['AI台本（月5投稿）', 'SNS健康診断', 'ボイスドラフト', `${WATERMARK} 透かし`],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '¥4,980/月',
    tagline: '個人店向け',
    features: ['無制限投稿', 'Meta/LINE 自動投稿', 'GBP 自動投稿', 'トレンド波乗り', '透かし削除'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '¥9,800/月',
    tagline: '小規模チーム',
    features: ['Starterの全機能', 'Slack連携', '承認フロー', 'LINEセグメント基本', 'A/Bテスト'],
  },
  {
    id: 'growth',
    name: 'Growth OS',
    price: '¥24,800/月',
    tagline: '美容・多店舗',
    features: ['Proの全機能', 'Auto Mode', 'HPB予約トラッキング', 'LINEセグメント高度＋ステップ', 'MEOダッシュボード'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '要見積',
    tagline: 'チェーン',
    features: ['多店舗統合（〜100）', '横断KPI/改ざん検知', '専任CSM・SLA', 'SSO/カスタムAPI'],
  },
];

export default function SettingsPage() {
  const { plan, setPlan } = useApp();
  const navigate = useNavigate();
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
  const [gbpConnected, setGbpConnected] = useState(false);
  const [gbpLocationName, setGbpLocationName] = useState('');
  const [hpbStoreUrl, setHpbStoreUrl] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [lineCost, setLineCost] = useState<LineCostEstimate | null>(null);
  const [customerTags, setCustomerTags] = useState<CustomerTag[]>([]);
  const [gbpReview, setGbpReview] = useState('');
  const [gbpReply, setGbpReply] = useState('');

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
        setHpbStoreUrl(s.hpbStoreUrl ?? '');
        setGbpConnected(!!s.gbpConnected);
        setGbpLocationName(s.gbpLocationName ?? '');
        setNotifyEmail(s.notifyEmail ?? '');
      })
      .catch(() => {});

    // Ayrshare / LINE 系は初期表示後に遅延取得（店舗・請求カードをブロックしない）
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 200);
    idle(() => {
      fetchSnsConnections()
        .then((r) => setSnsConnections(r.snsConnections))
        .catch(() => {});
      fetchSlackIdeas()
        .then((r) => setSlackIdeas(r.ideas))
        .catch(() => {});
      fetchLineCostEstimate()
        .then(setLineCost)
        .catch(() => {});
      fetchCustomerTags()
        .then((r) => setCustomerTags(r.tags))
        .catch(() => {});
    });

    const planParam = searchParams.get('plan') as PlanTier | null;
    const campaign = searchParams.get('campaign');
    if (planParam && ['line_lite', 'line_pro', 'free', 'starter', 'pro', 'growth', 'enterprise'].includes(planParam)) {
      setPlan(planParam);
      if (campaign === 'lstep500' && planParam === 'line_lite') {
        setMessage('Lステップ解約キャンペーン: LINE CRM Lite 初回3ヶ月 ¥500/月 が適用されます');
      }
    }

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
        hpbStoreUrl,
        gbpConnected: gbpConnected || !!gbpLocationName.trim(),
        gbpLocationName,
        notifyEmail,
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

  const handleGbpConnect = async () => {
    try {
      const { url } = await startGbpOAuth();
      window.location.href = url;
    } catch {
      setMessage('Google Business Profile 連携は Phase 4 で提供予定です（OAuth 設定後に有効化されます）');
    }
  };

  return (
    <div className="buzz-page-narrow">
      {message && <p className="buzz-alert buzz-alert-info">{message}</p>}

      <StoreBillingSection />

      <section className="buzz-card-pad">
        <h3 className="mb-2 text-lg font-bold">LINE CRM プラン（Lステップ代替）</h3>
        <p className="mb-4 text-sm text-neutral-600">
          SNS 不要の店舗向け。LINE 公式の請求は各店舗への直接請求のまま。BuzzIt は CRM ツール代のみ。
          <a
            href="https://shigotoku.com/buzzit/#line-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-medium text-neutral-900 underline"
          >
            試算ツール
          </a>
        </p>
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {lineCrmPlans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`border p-5 text-left transition-colors ${
                plan === p.id
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white hover:border-neutral-400'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-bold">{p.name}</span>
                <span className={`text-sm ${plan === p.id ? 'text-neutral-300' : 'text-neutral-600'}`}>{p.price}</span>
              </div>
              {p.promo && (
                <p className={`mb-2 text-xs ${plan === p.id ? 'text-neutral-400' : 'text-green-700'}`}>{p.promo}</p>
              )}
              <p className={`mb-3 text-[10px] uppercase tracking-wider ${plan === p.id ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {p.tagline}
              </p>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${plan === p.id ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    <Check className={`h-3.5 w-3.5 shrink-0 ${plan === p.id ? 'text-white' : 'text-neutral-800'}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <h3 className="mb-2 text-lg font-bold">BuzzIt フルスタック</h3>
        <p className="mb-6 text-sm text-neutral-600">
          年払いで2ヶ月分無料。Growth OS は AI-BOUZ + AI-LINE + Lステップの 3本契約相当の機能を ¥24,800 に集約。
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fullStackPlans.map((p) => (
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
              <div className="mb-1 flex items-center justify-between">
                <span className="font-bold">{p.name}</span>
                <span className="text-sm text-neutral-600">{p.price}</span>
              </div>
              <p className="mb-3 text-[10px] uppercase tracking-wider text-neutral-500">{p.tagline}</p>
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
          <option value="gbp">Google Business Profile（Phase 4）</option>
          <option value="auto">自動（接続状況に応じて最適化）</option>
          <option value="ayrshare">Ayrshare（レガシー・任意）</option>
        </select>
      </section>

      <section className="buzz-card-pad space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Link2 className="h-5 w-5 text-neutral-700" />
          Ayrshare（オプション・X連携向け）
        </h3>
        <p className="text-sm text-neutral-600">
          Ayrshare は外部の投稿予約サービスです。X（旧Twitter）は公式 API の料金が高いため、BuzzIt では
          Ayrshare 経由での予約投稿に対応しています。プロファイルキーを入れると Instagram / X / TikTok
          などの接続状態を確認でき、投稿モード「Ayrshare」で予約できます。未設定でも通知モードで運用可能です。
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

      <section className="buzz-card-pad space-y-4">
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

      <button type="button" onClick={handleSave} disabled={saving} className="buzz-btn-primary disabled:opacity-70">
        <Save className="h-4 w-4" />
        {saving ? '保存中...' : '設定を保存'}
      </button>
    </div>
  );
}
