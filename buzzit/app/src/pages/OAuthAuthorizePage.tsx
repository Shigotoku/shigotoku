import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, ShieldCheck } from 'lucide-react';
import { authFetch } from '../lib/api';
import { usePersona } from '../store/personaContext';

/** ChatGPT / Claude などが「バジットに接続」するときの許可画面 */
export default function OAuthAuthorizePage() {
  const [params] = useSearchParams();
  const { personas, activePersonaId, refreshPersonas } = usePersona();
  const [clientName, setClientName] = useState('');
  const [personaId, setPersonaId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const clientId = params.get('client_id') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';

  useEffect(() => {
    refreshPersonas().catch(() => {});
    authFetch(`/v1/oauth/client?client_id=${encodeURIComponent(clientId)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? '接続元を確認できません');
        setClientName(d.name);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '接続元を確認できません'));
  }, [clientId, refreshPersonas]);

  useEffect(() => {
    if (!personaId && (activePersonaId || personas[0])) setPersonaId(activePersonaId ?? personas[0].id);
  }, [activePersonaId, personas, personaId]);

  const approve = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await authFetch('/v1/oauth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          state: params.get('state') ?? undefined,
          code_challenge: params.get('code_challenge'),
          code_challenge_method: params.get('code_challenge_method') ?? 'S256',
          personaId,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? '承認に失敗しました');
      window.location.href = d.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : '承認に失敗しました');
      setBusy(false);
    }
  };

  const deny = () => {
    try {
      const u = new URL(redirectUri);
      u.searchParams.set('error', 'access_denied');
      const st = params.get('state');
      if (st) u.searchParams.set('state', st);
      window.location.href = u.toString();
    } catch {
      window.history.back();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <img src="/icon-256.png" alt="BuzzIt" className="h-12 w-12 rounded-xl" />
          <span className="text-lg font-bold">BuzzIt</span>
        </div>
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Bot className="h-5 w-5" />
          AIアプリの接続を許可しますか？
        </h1>
        <p className="text-sm text-neutral-700">
          <strong>{clientName || '…'}</strong> が Buzzit に接続しようとしています。
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-600">接続する配信キャラ</span>
          <select value={personaId} onChange={(e) => setPersonaId(e.target.value)} className="w-full rounded border border-neutral-300 px-3 py-2">
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <ul className="space-y-1 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">
          <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />できること: 予定・履歴の確認、ネタと<strong>下書き</strong>の作成</li>
          <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />できないこと: 承認・予約確定・投稿（必ずあなたが確認します）</li>
          <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />あとから 設定 → AI連携 でいつでも解除できます</li>
        </ul>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={deny} className="buzz-btn-secondary flex-1">
            キャンセル
          </button>
          <button type="button" onClick={approve} disabled={busy || !personaId || !clientName} className="buzz-btn-primary flex-1 disabled:opacity-60">
            {busy ? '接続中…' : '許可する'}
          </button>
        </div>
      </div>
    </div>
  );
}
