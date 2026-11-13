import { useCallback, useEffect, useState } from 'react';
import { Bot, Copy, Check, KeyRound, Trash2 } from 'lucide-react';
import { API_BASE, authFetch } from '../lib/api';
import { usePersona } from '../store/personaContext';

type Tool = 'cursor' | 'claudeCode' | 'gemini';

interface KeyRow {
  id: string;
  label: string;
  personaId: string;
  revoked: boolean;
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `エラー (${res.status})`);
  return body as T;
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-700">{label}</p>
        <button
          type="button"
          className="buzz-btn-secondary !px-2 !py-1 text-xs"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
        >
          {done ? <Check className="mr-1 inline h-3 w-3" /> : <Copy className="mr-1 inline h-3 w-3" />}
          {done ? 'コピーしました' : 'コピー'}
        </button>
      </div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-neutral-900 p-3 text-[11px] text-neutral-100">
        {value}
      </pre>
    </div>
  );
}

/** AI（Cursor / Claude など）とバジットをつなぐ設定。キャラごとにキーを発行する。 */
export default function AiConnectSection() {
  const { activePersona } = usePersona();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('cursor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await json<{ keys: KeyRow[] }>(await authFetch('/v1/agent/keys'));
      setKeys(data.keys.filter((k) => !k.revoked));
    } catch {
      /* 一覧は失敗しても致命的でない */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!activePersona) return null;
  const name = activePersona.name;

  const issue = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await json<{ apiKey: string }>(
        await authFetch('/v1/agent/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: `${name} 用AI連携`, personaId: activePersona.id }),
        }),
      );
      setNewKey(data.apiKey);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'キーの発行に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm('このキーを無効にします。AI側の設定も使えなくなります。よろしいですか？')) return;
    await authFetch(`/v1/agent/keys/${id}`, { method: 'DELETE' });
    await load();
  };

  const serverName = `buzzit-${name.replace(/[^\w]/g, '') || 'persona'}`;
  const base = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
  const url = `${base}/v1/agent/mcp`;
  const keyText = newKey ?? '<発行したキー>';
  const configs: Record<Tool, { label: string; where: string; value: string }> = {
    cursor: {
      label: 'Cursor / VS Code',
      where: 'Cursor: Settings → MCP → Add（mcp.json に貼り付け）',
      value: JSON.stringify(
        { mcpServers: { [serverName]: { url, headers: { Authorization: `Bearer ${keyText}` } } } },
        null,
        2,
      ),
    },
    claudeCode: {
      label: 'Claude Code',
      where: 'ターミナルで1行実行するだけ',
      value: `claude mcp add --transport http ${serverName} ${url} --header "Authorization: Bearer ${keyText}"`,
    },
    gemini: {
      label: 'Gemini CLI',
      where: '~/.gemini/settings.json に貼り付け',
      value: JSON.stringify(
        { mcpServers: { [serverName]: { httpUrl: url, headers: { Authorization: `Bearer ${keyText}` } } } },
        null,
        2,
      ),
    },
  };
  const cfg = configs[tool];  const prompt = `あなたは「${name}」のSNS編集長です。Buzzit のツールを使って投稿を管理してください。
手順: 1) list_scheduled で今後の予定と過去の投稿を確認 2) 案ごとに check_duplicate で重複確認 3) 問題なければ create_draft で下書き保存（投稿はされません）。
ネタだけ残す場合は add_idea を使います。承認と予約はバジット上で人が行います。
まず来週分（週◯本）の投稿案を提案してください。`;

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <Bot className="h-5 w-5 text-neutral-700" />
        AI連携（「{name}」の投稿をAIに任せる）
      </h3>
      <p className="text-sm text-neutral-600">
        AI（Cursor・Claude など）が、このキャラの予定を見て重複を避けながらネタ・下書きをバジットに直接書き込めます。
        <strong>AIにできるのは「ネタ追加」と「下書き作成」だけ</strong>で、承認・予約・投稿は必ずあなたがバジットで行います。
      </p>

      <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-700">
        <li>下のボタンで「{name}」用のキーを発行（キャラごとに別キー）</li>
        <li>お使いのAIツールを選び、表示された設定を貼り付け（インストール不要・URLとキーだけ）</li>
        <li>下の依頼文をAIに送れば完了</li>
      </ol>

      <button type="button" onClick={issue} disabled={busy} className="buzz-btn-primary disabled:opacity-70">
        <KeyRound className="mr-1 inline h-4 w-4" />
        {busy ? '発行中…' : `「${name}」用のAI連携キーを発行`}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {newKey && (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs text-amber-900">
            キーは今回しか表示されません。この設定をコピーして保管してください（他人に共有しないでください）。
          </p>
          <select
            value={tool}
            onChange={(e) => setTool(e.target.value as Tool)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
          >
            {(Object.keys(configs) as Tool[]).map((t) => (
              <option key={t} value={t}>
                {configs[t].label}
              </option>
            ))}
          </select>
          <CopyBox label={`${cfg.label} の設定（${cfg.where}）`} value={cfg.value} />
        </div>
      )}

      <CopyBox label="AIに送る依頼文（コピーして貼るだけ）" value={prompt} />

      {keys.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-700">発行済みキー</p>
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <span>{k.label}</span>
              <button type="button" onClick={() => revoke(k.id)} className="text-xs text-red-600 hover:underline">
                <Trash2 className="mr-1 inline h-3 w-3" />
                無効にする
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

