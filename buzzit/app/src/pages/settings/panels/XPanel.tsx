import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { authFetch } from '../../../lib/api';
import { usePersona } from '../../../store/personaContext';

interface BufferChannel { id: string; name: string; service: string }

async function bufferCall<T>(path: string, body?: unknown): Promise<T> {
  const res = await authFetch(`/v1/buffer/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? `エラー(${res.status})`);
  return j as T;
}

/** Buffer(無料プラン可)経由で X に自動投稿する設定。連携すると X API の料金はかかりません */
function BufferSection() {
  const { activePersona } = usePersona();
  const connected = !!(activePersona as { bufferConnected?: boolean } | null)?.bufferConnected;
  const channelName = (activePersona as { bufferChannelName?: string } | null)?.bufferChannelName;
  const [key, setKey] = useState('');
  const [channels, setChannels] = useState<BufferChannel[]>([]);
  const [channelId, setChannelId] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg('');
    try { await fn(); } catch (e) { setMsg(e instanceof Error ? e.message : '失敗しました'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-2 border border-violet-200 bg-violet-50/40 p-4">
      <h4 className="text-sm font-bold">
        Buffer 経由で X に投稿
        <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">推奨・無料</span>
      </h4>
      <p className="text-xs text-neutral-600">
        <a className="underline" href="https://buffer.com" target="_blank" rel="noreferrer">Buffer</a> は<strong>個人メールで登録して構いません</strong>。
        その中に<strong>会社の X アカウントをチャンネルとして接続</strong>し、発行した API キー(個人用)を入力します。
        予約時刻になると BuzzIt が Buffer に渡し、約2分後に X へ投稿されます(X API の従量課金はかかりません)。
        無料プランは 3 チャンネルまで。API はおおむね 30 日で 3,000 リクエスト(アカウント共有)。連携キャラは Buffer が優先されます。
      </p>
      {connected ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs">接続済み: {channelName}</span>
          <button type="button" disabled={busy} className="buzz-btn-secondary" onClick={() => run(async () => { await bufferCall('disconnect'); window.location.reload(); })}>連携解除</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Buffer の API キー" className="buzz-input max-w-xs" autoComplete="off" />
            <button type="button" disabled={busy || !key.trim()} className="buzz-btn-secondary" onClick={() => run(async () => {
              const r = await bufferCall<{ channels: BufferChannel[] }>('channels', { apiKey: key.trim() });
              setChannels(r.channels); setChannelId(r.channels.find((c) => /twitter|^x$/i.test(c.service))?.id ?? r.channels[0]?.id ?? '');
              if (!r.channels.length) setMsg('チャンネルがありません。Buffer で X を接続してください');
            })}>チャンネルを取得</button>
          </div>
          {channels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select className="buzz-input max-w-xs" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}（{c.service}）</option>)}
              </select>
              <button type="button" disabled={busy || !channelId} className="buzz-btn-primary" onClick={() => run(async () => { await bufferCall('connect', { apiKey: key.trim(), channelId }); window.location.reload(); })}>このキャラの X 投稿先にする</button>
            </div>
          )}
        </div>
      )}
      {msg && <p className="text-xs text-red-600">{msg}</p>}
      <p className="text-[11px] text-neutral-500">スレッド(複数ポスト)は Buffer 連携では未対応です。リンク入りでも追加料金はかかりません。</p>
    </div>
  );
}


export default function XPanel() {
  const { xConnected, xUsername, xApiPostsThisMonth, xApiMonthlyLimit, xApiKey, setXApiKey, xApiSecret, setXApiSecret, xAccessToken, setXAccessToken, xAccessSecret, setXAccessSecret, xTesting, handleXTestAndSave, handleXDisconnect } = useSettings();
  return (
    <>
      <section id="settings-x" className="buzz-card-pad scroll-mt-24 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Share2 className="h-5 w-5 text-neutral-700" />
          X（旧Twitter）API 連携
        </h3>
        <p className="text-sm text-neutral-600">
          X の自動投稿は、下の <strong>Buffer 連携(推奨)</strong> か、X Developer のキー(従量課金)のどちらかです。
          鍵はサーバーのみに保存し、画面には再表示しません。
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <p className="text-sm font-medium">
              {xConnected ? `接続済み${xUsername ? ` (@${xUsername})` : ''}` : '未接続'}
            </p>
            <p className="text-xs text-neutral-500">
              今月の投稿: {xApiPostsThisMonth} / {xApiMonthlyLimit}（BuzzIt の安全上限。実際の課金は X 側のクレジット残高です）
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              xConnected
                ? 'border border-neutral-300 bg-white text-neutral-800'
                : 'bg-neutral-200 text-neutral-600'
            }`}
          >
            {xConnected ? '接続済み' : '未接続'}
          </span>
        </div>
        <BufferSection />
        <p className="text-xs font-semibold text-neutral-700">または X API のキーで直接投稿(従量課金)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="buzz-label">API Key</label>
            <input
              value={xApiKey}
              onChange={(e) => setXApiKey(e.target.value)}
              placeholder={xConnected ? '変更する場合のみ入力' : 'API Key'}
              className="buzz-input"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="buzz-label">API Secret</label>
            <input
              type="password"
              value={xApiSecret}
              onChange={(e) => setXApiSecret(e.target.value)}
              placeholder={xConnected ? '変更する場合のみ入力' : 'API Secret'}
              className="buzz-input"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="buzz-label">Access Token</label>
            <input
              value={xAccessToken}
              onChange={(e) => setXAccessToken(e.target.value)}
              placeholder={xConnected ? '変更する場合のみ入力' : 'Access Token'}
              className="buzz-input"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="buzz-label">Access Token Secret</label>
            <input
              type="password"
              value={xAccessSecret}
              onChange={(e) => setXAccessSecret(e.target.value)}
              placeholder={xConnected ? '変更する場合のみ入力' : 'Access Token Secret'}
              className="buzz-input"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={xTesting}
            onClick={handleXTestAndSave}
            className="buzz-btn-primary disabled:opacity-60"
          >
            {xTesting ? '確認中...' : xConnected ? '再接続テスト' : '接続テストして保存'}
          </button>
          {xConnected && (
            <button type="button" onClick={handleXDisconnect} className="buzz-btn-secondary">
              連携解除
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-500">
          Developer Portal で App permissions を Read and Write にし、ユーザートークンを発行してください。
          いいね・フォロー自動化などは行いません（投稿のみ）。
          X API は従量課金(事前にクレジットを購入)で、無料枠はありません。目安: 通常の投稿 約$0.015/件、URL(リンク)入りの投稿 約$0.20/件。クレジットが尽きると投稿できません。最新の料金は X Developer Console で確認してください。
        </p>
        <Link to="/x-series" className="inline-block text-sm underline-offset-2 hover:underline">
          Xシリーズ（曜日キュー）の管理へ →
        </Link>
      </section>
    </>
  );
}
