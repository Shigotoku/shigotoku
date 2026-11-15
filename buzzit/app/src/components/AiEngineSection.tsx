import { useEffect, useState } from 'react';
import { KeyRound, Sparkles } from 'lucide-react';
import { authFetch } from '../lib/api';

interface Provider {
  id: 'gemini' | 'openai' | 'anthropic';
  label: string;
  defaultModel: string;
}
interface View {
  mode: 'platform' | 'own';
  provider: Provider['id'];
  model: string;
  hasKey: boolean;
  last4?: string;
  providers: Provider[];
  platformUsage: { used: number; limit: number };
  plan: string;
}

/** 画面内AI機能（台本生成・要点・トレンド等）を「運営AI（回数上限あり）」か「自分のAIキー（上限なし）」のどちらで動かすか選ぶ */
export default function AiEngineSection() {
  const [v, setV] = useState<View | null>(null);
  const [mode, setMode] = useState<'platform' | 'own'>('platform');
  const [provider, setProvider] = useState<Provider['id']>('gemini');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = (d: View) => {
    setV(d);
    setMode(d.mode);
    setProvider(d.provider);
    setModel(d.model);
    setApiKey('');
  };

  useEffect(() => {
    authFetch('/v1/ai/settings')
      .then((r) => r.json())
      .then(apply)
      .catch(() => {});
  }, []);

  if (!v) return null;

  const def = v.providers.find((p) => p.id === provider)?.defaultModel ?? '';

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await authFetch('/v1/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, provider, model: model === def ? '' : model, apiKey: apiKey || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? '保存に失敗しました');
      apply({ ...v, ...d });
      setMsg('保存しました');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存に失敗しました');
    }
    setBusy(false);
  };

  const removeKey = async () => {
    if (!window.confirm('保存済みのAPIキーを削除します。よろしいですか？')) return;
    const res = await authFetch('/v1/ai/key', { method: 'DELETE' });
    if (res.ok) apply({ ...v, ...(await res.json()) });
    setMsg('APIキーを削除しました（運営AIに戻りました）');
  };

  const radio = (value: 'platform' | 'own', title: string, body: string) => (
    <label className={`flex cursor-pointer gap-2 rounded-lg border p-2 text-sm ${mode === value ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'}`}>
      <input type="radio" checked={mode === value} onChange={() => setMode(value)} className="mt-1" />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-xs text-neutral-600">{body}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <Sparkles className="h-5 w-5 text-neutral-700" />
        画面のAI機能で使うAI
      </h3>
      <p className="text-sm text-neutral-600">
        台本生成・分析の要点・トレンド提案などの「画面のAI機能」を、どちらのAIで動かすか選べます（ChatGPT等のMCP連携とは別の設定です）。
      </p>
      {radio(
        'platform',
        '運営のAIを使う',
        `キー不要ですぐ使えます。月の回数上限があります（今月 ${v.platformUsage.used} / ${v.platformUsage.limit} 回・プラン: ${v.plan}）。`,
      )}
      {radio('own', '自分のAIキーを使う', '回数上限なし。料金はご自身のAI契約（APIの従量課金）にかかります。')}

      {mode === 'own' && (
        <div className="space-y-2 rounded-lg border border-neutral-200 p-2 text-sm">
          <label className="block">
            <span className="text-[11px] text-neutral-500">提供元</span>
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value as Provider['id'];
                setProvider(p);
                setModel(v.providers.find((x) => x.id === p)?.defaultModel ?? '');
              }}
              className="w-full rounded border border-neutral-300 px-2 py-1"
            >
              {v.providers.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="flex items-center gap-1 text-[11px] text-neutral-500">
              <KeyRound className="h-3 w-3" />
              APIキー {v.hasKey && v.provider === provider && `（保存済み …${v.last4}・変更する場合のみ入力）`}
            </span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={v.hasKey && v.provider === provider ? '変更しない場合は空欄' : 'APIキーを貼り付け'}
              className="w-full rounded border border-neutral-300 px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-neutral-500">モデル名（通常は変更不要）</span>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={def} className="w-full rounded border border-neutral-300 px-2 py-1" />
          </label>
          <p className="text-[11px] text-neutral-500">
            保存時にキーを1回だけ試し送信して確認します。キーは暗号化して保存し、画面やログには表示しません。音声からの下書きは Gemini のキーのみ対応です。
            キーが使えない場合は、簡易テンプレートで代替されます。
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={busy} className="buzz-btn-primary !px-4 !py-1.5 text-sm disabled:opacity-70">
          {busy ? '確認中…' : '保存'}
        </button>
        {v.hasKey && (
          <button type="button" onClick={removeKey} className="buzz-btn-secondary !px-3 !py-1.5 text-sm">
            保存済みキーを削除
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-neutral-700">{msg}</p>}
    </div>
  );
}
