import { useCallback, useEffect, useState } from 'react';
import { Bot, Copy, Check, KeyRound, Trash2 } from 'lucide-react';
import { API_BASE, authFetch, fetchAuditLogs } from '../lib/api';
import { usePersona } from '../store/personaContext';

type Tool = 'web' | 'cursor' | 'claudeCode' | 'gemini';

interface KeyRow {
  id: string;
  label: string;
  personaId: string;
  revoked: boolean;
  lastUsedAt?: string | null;
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
  const [tool, setTool] = useState<Tool>('web');
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

  const [logs, setLogs] = useState<Array<{ id: string; action: string; detail: string; createdAt: string }>>([]);
  useEffect(() => {
    load();
    fetchAuditLogs()
      .then((r) => setLogs(r.logs.filter((l) => l.action.startsWith('agent')).slice(0, 8)))
      .catch(() => undefined);
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
    web: {
      label: 'ChatGPT / Claude（Web）',
      where: 'コネクタ（カスタム）の追加でこのURLだけを貼る。ログイン画面で「許可」を押せば完了（キー不要）',
      value: url,
    },
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
  const cfg = configs[tool];
  const prompt = `あなたは「${name}」のSNS編集長です。Buzzit のツールで投稿を管理します（投稿・承認はできず、必ず下書きまで）。
手順:
まず whoami で接続中のキャラとSNSアカウントを確認し、「${name}」であることを確かめてください（違う場合は中止して私に知らせてください）。
投稿計画（シリーズ）が未登録なら list_series で確認し、upsert_plan は必ず dryRun=true のプレビューを見せてください（保存は私が確認してから）。実績が無い項目の成果や理由は創作しないでください。
0) 投稿計画があれば plan_gaps で空き枠（日時・媒体・テーマ）を取得し、その枠を埋める
1) overview・tag_report・performance_report で、予定・過去の投稿・タグ別の実績・伸びた型を確認
2) 使用回数の多いタグや直近の内容と被らない切り口を選ぶ
3) check_duplicate で重複確認
4) 画像・動画があれば upload_media（URL指定）か get_upload_url で送る
5) tags と topic を付けて create_draft（X・Instagram・YouTube Shorts・Googleビジネスなど媒体ごと）
6) 他SNSへ展開するときは adapt_post（まず dryRun で確認）
作成後、下書きの一覧と警告（画像/動画が必要など）を報告してください。
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

      <div className="space-y-2">
        <p className="text-xs font-semibold text-neutral-700">① お使いのAIを選ぶ</p>
        <select
          value={tool}
          onChange={(e) => setTool(e.target.value as Tool)}
          className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        >
          {(Object.keys(configs) as Tool[]).map((t) => (
            <option key={t} value={t}>
              {configs[t].label}
            </option>
          ))}
        </select>
      </div>

      {tool === 'web' ? (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-900">
            キーの発行は不要です。ChatGPT / Claude の「コネクタ（カスタム）」にこのURLを貼り、表示されるバジットのログイン画面で「許可する」を押すだけです。
          </p>
          <CopyBox label="MCP サーバーURL" value={url} />
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-neutral-700">② 「{name}」用のキーを発行して設定に貼る</p>
          <button type="button" onClick={issue} disabled={busy} className="buzz-btn-primary disabled:opacity-70">
            <KeyRound className="mr-1 inline h-4 w-4" />
            {busy ? '発行中…' : `「${name}」用のAI連携キーを発行`}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {newKey ? (
            <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs text-amber-900">
                キーは今回しか表示されません。この設定をコピーして保管してください（他人に共有しないでください）。
              </p>
              <CopyBox label={`${cfg.label} の設定（${cfg.where}）`} value={cfg.value} />
            </div>
          ) : (
            <p className="text-xs text-neutral-500">キーを発行すると、{cfg.label} に貼る設定が表示されます。</p>
          )}
        </>
      )}

      <p className="text-xs font-semibold text-neutral-700">③ 依頼文をAIに送る</p>
      <CopyBox label="AIに送る依頼文（コピーして貼るだけ）" value={prompt} />

      {keys.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-700">発行済みキー</p>
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <span>
                {k.label}
                <span className="ml-2 text-xs text-neutral-500">
                  {k.lastUsedAt ? `最終利用 ${new Date(k.lastUsedAt).toLocaleString('ja-JP')}` : '未使用（接続待ち）'}
                </span>
              </span>
              <button type="button" onClick={() => revoke(k.id)} className="text-xs text-red-600 hover:underline">
                <Trash2 className="mr-1 inline h-3 w-3" />
                無効にする
              </button>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-700">AIの操作履歴（直近）</p>
          {logs.map((l) => (
            <p key={l.id} className="rounded-lg border border-neutral-100 px-3 py-1.5 text-xs text-neutral-700">
              <span className="text-neutral-400">{new Date(l.createdAt).toLocaleString('ja-JP')}</span>{' '}
              {l.action === 'agent.draft.create' ? '下書きを作成' : l.action === 'agent.idea.add' ? 'ネタを追加' : l.action === 'agent_key.create' ? 'キーを発行' : l.action === 'agent_key.revoke' ? 'キーを無効化' : l.action}
              {l.detail ? ` · ${l.detail}` : ''}
            </p>
          ))}
          <p className="text-[11px] text-neutral-500">AIは下書きとネタの追加しかできません。予約・承認・投稿は必ずあなたが行います。</p>
        </div>
      )}
    </div>
  );
}

