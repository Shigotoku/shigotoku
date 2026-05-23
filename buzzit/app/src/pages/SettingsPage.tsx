import { useEffect, useState } from 'react';
import { Check, Link2, MessageSquare, Zap, Save, BarChart3 } from 'lucide-react';
import { WATERMARK } from '../constants/brand';
import {
  fetchSettings,
  updateSettings,
  submitSlackIdea,
  fetchSlackIdeas,
  approveSlackIdea,
  runAutoMode,
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
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [ayrshareProfileKey, setAyrshareProfileKey] = useState('');
  const [slackTeamId, setSlackTeamId] = useState('');
  const [autoModeEnabled, setAutoModeEnabled] = useState(false);
  const [lineChannelSecret, setLineChannelSecret] = useState('');
  const [lineDestinationId, setLineDestinationId] = useState('');
  const [defaultDestinationUrl, setDefaultDestinationUrl] = useState('');
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
        setLineDestinationId(s.lineDestinationId ?? '');
        setDefaultDestinationUrl(s.defaultDestinationUrl ?? '');
        setLineWebhookUrl(s.lineWebhookUrl ?? '');
        setSnsConnections(s.snsConnections);
      })
      .catch(() => {});
    fetchSlackIdeas()
      .then((r) => setSlackIdeas(r.ideas))
      .catch(() => {});
  }, [setPlan]);

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
        lineDestinationId,
        defaultDestinationUrl,
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">設定</h2>
        <p className="text-slate-400">プラン・GCP 連携・Slack・Ayrshare の管理</p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-sm">
          {message}
        </div>
      )}

      <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8">
        <h3 className="text-lg font-bold mb-6">プラン</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`text-left p-5 rounded-xl border transition-all ${
                plan === p.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">{p.name}</span>
                <span className="text-indigo-400 text-sm">{p.price}</span>
              </div>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="text-sm text-slate-400 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Link2 className="w-5 h-5 text-indigo-400" />
          SNS連携（Ayrshare）
        </h3>
        <div className="space-y-3">
          {snsConnections.map((sns) => (
            <div key={sns.name} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <span>{sns.name}</span>
              <span className={`text-xs px-3 py-1 rounded-full ${sns.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {sns.connected ? '接続済み' : '未接続'}
              </span>
            </div>
          ))}
        </div>
        <label className="text-xs text-slate-400 block">Ayrshare プロファイルキー</label>
        <input
          value={ayrshareProfileKey}
          onChange={(e) => setAyrshareProfileKey(e.target.value)}
          placeholder="Profile-Key（任意）"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
      </section>

      <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          Slack 連携（Team 以上）
        </h3>
        <label className="text-xs text-slate-400 block">Incoming Webhook URL</label>
        <input
          value={slackWebhookUrl}
          onChange={(e) => setSlackWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
        <label className="text-xs text-slate-400 block">Slack Team ID（Events API 用）</label>
        <input
          value={slackTeamId}
          onChange={(e) => setSlackTeamId(e.target.value)}
          placeholder="T01234567"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
          <input
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            placeholder="ネタを入力（Slack 風テスト）"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button type="button" onClick={handleSubmitIdea} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium">
            送信
          </button>
        </div>
        {slackIdeas.length > 0 && (
          <div className="space-y-2 mt-4">
            {slackIdeas.slice(0, 5).map((idea) => (
              <div key={idea.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-sm">
                <p className="text-slate-300">{idea.text}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">{idea.status}</span>
                  {idea.status === 'pending' && (
                    <button type="button" onClick={() => approveSlackIdea(idea.id)} className="text-xs text-indigo-400 hover:text-indigo-300">
                      採用
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          売上トラッキング（UTM / LINE）
        </h3>
        <p className="text-sm text-slate-400">
          投稿からのクリックと LINE 友だち追加を自動計測します。予約投稿時に計測リンクが自動生成されます。
        </p>
        <label className="text-xs text-slate-400 block">リダイレクト先 URL（店舗サイト・予約ページ等）</label>
        <input
          value={defaultDestinationUrl}
          onChange={(e) => setDefaultDestinationUrl(e.target.value)}
          placeholder="https://example.com/reserve"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
        <label className="text-xs text-slate-400 block">LINE Channel Secret</label>
        <input
          value={lineChannelSecret}
          onChange={(e) => setLineChannelSecret(e.target.value)}
          placeholder="LINE Developers で取得"
          type="password"
          autoComplete="off"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
        <label className="text-xs text-slate-400 block">LINE Destination ID（Webhook の destination 値）</label>
        <input
          value={lineDestinationId}
          onChange={(e) => setLineDestinationId(e.target.value)}
          placeholder="Uxxxxxxxx..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
        {lineWebhookUrl && (
          <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4">
            <p className="text-xs text-slate-400 mb-2">LINE Webhook URL（Messaging API に設定）</p>
            <code className="block text-xs text-emerald-300 break-all">{lineWebhookUrl}</code>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-8 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-400" />
          Auto Mode（Growth OS）
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoModeEnabled}
            onChange={(e) => setAutoModeEnabled(e.target.checked)}
            className="w-4 h-4 rounded accent-indigo-500"
          />
          <span className="text-sm">毎朝 Auto Mode を自動実行（Cloud Scheduler）</span>
        </label>
        <button type="button" onClick={handleAutoMode} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-medium">
          今すぐ Auto Mode を実行
        </button>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-70"
      >
        <Save className="w-4 h-4" />
        {saving ? '保存中...' : '設定を保存'}
      </button>
    </div>
  );
}
