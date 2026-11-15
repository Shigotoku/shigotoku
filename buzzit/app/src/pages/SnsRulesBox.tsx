import { useEffect, useState } from 'react';
import { authFetch } from '../lib/api';

/** 投稿候補の媒体ID(x_thread 等) → ルールのID(管理画面のSNS ID) */
export const RULE_ID_OF: Record<string, string> = {
  x_thread: 'x', instagram: 'instagram', tiktok: 'tiktok', facebook: 'facebook-threads', threads: 'facebook-threads',
  youtube_shorts: 'youtube-shorts', line: 'line', gbp: 'gbp',
};

interface Rule { platform: string; label: string; text: string; updatedAt?: string; updatedBy?: 'user' | 'ai' }

/** そのSNSの運用ルール(自由記載)。人も、使っているAI(MCP)も書き込める */
export default function SnsRulesBox({ ruleId, defaultOpen = false }: { ruleId: string; defaultOpen?: boolean }) {
  const [rule, setRule] = useState<Rule | null>(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRule(null);
    authFetch('/v1/sns-rules')
      .then((r) => r.json())
      .then((j: { rules: Rule[] }) => {
        const r = j.rules.find((x) => x.platform === ruleId) ?? null;
        setRule(r);
        setText(r?.text ?? '');
      })
      .catch(() => setMsg('ルールを読み込めませんでした'));
  }, [ruleId]);

  if (!rule) return msg ? <p className="text-xs text-rose-700">{msg}</p> : null;
  const dirty = text !== rule.text;

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await authFetch(`/v1/sns-rules/${encodeURIComponent(ruleId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? '保存できませんでした');
      setRule(j.rule);
      setText(j.rule.text);
      setMsg('保存しました。AIもこのルールを読んでネタを作ります。');
    } catch (e) { setMsg(e instanceof Error ? e.message : '保存できませんでした'); } finally { setBusy(false); }
  };

  return (
    <details open={defaultOpen || undefined} className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold">
        {rule.label}のルール
        <span className="ml-2 font-normal text-neutral-500">{rule.text ? `${rule.text.split('\n').filter(Boolean).length}行` : 'まだありません'}</span>
        {rule.updatedBy === 'ai' && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-normal text-violet-700">AIが更新</span>}
      </summary>
      <p className="mt-2 text-xs text-neutral-500">
        自由に書けます。例:「月曜は医療制度のネタ」「金曜はクリニック改善の小ネタ」「診療報酬の断定的な表現はしない」「同じオチは続けない」。ChatGPT などのAI(MCP連携)も、ネタを作る前にここを読み、頼めば追記します。
      </p>
      <textarea className="mt-2 h-32 w-full rounded-lg border p-2 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={'例）\n月曜: 医療制度のネタ\n金曜: クリニック改善の小ネタ\n載せない: 特定の薬の効果の断定'} />
      <div className="mt-1 flex items-center gap-2">
        <button disabled={!dirty || busy} onClick={save} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">ルールを保存</button>
        {msg && <span className="text-xs text-neutral-600">{msg}</span>}
        {rule.updatedAt && <span className="ml-auto text-[11px] text-neutral-400">最終更新 {new Date(rule.updatedAt).toLocaleString('ja-JP')}</span>}
      </div>
    </details>
  );
}
