import { useState } from 'react';
import { Search } from 'lucide-react';
import { authFetch } from '../lib/api';

interface Match {
  kind: 'scheduled' | 'idea';
  id: string;
  status: string;
  platform?: string;
  scheduledAt?: string;
  text: string;
  score: number;
}

const STATUS: Record<string, string> = {
  published: '投稿済み',
  notified: '通知済み',
  pending: '予約済み',
  pending_approval: '承認待ち',
  draft: '下書き',
  failed: '失敗',
  pending_idea: 'ネタ',
};

/** 作成・編集中の文章と似た過去投稿を、ボタン1つで表示（ルールベース・AI不使用） */
export default function SimilarPostsCheck({ text, platform, excludeId }: { text: string; platform?: string; excludeId?: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ duplicate: boolean; matches: Match[] } | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await authFetch('/v1/agent/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '確認に失敗しました');
      setResult({ ...data, matches: (data.matches as Match[]).filter((m) => m.id !== excludeId) });
    } catch (e) {
      setError(e instanceof Error ? e.message : '確認に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={busy || !text.trim()}
        className="inline-flex items-center gap-1.5 border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-neutral-900 disabled:opacity-50"
      >
        <Search className="h-3.5 w-3.5" />
        {busy ? '確認中…' : '過去の類似投稿を確認'}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {result && (
        <div className="space-y-1.5">
          <p className={`text-xs font-medium ${result.matches.some((m) => m.score >= 0.5) ? 'text-red-700' : 'text-emerald-700'}`}>
            {result.matches.length === 0
              ? '似た過去の投稿は見つかりませんでした。'
              : result.matches.some((m) => m.score >= 0.5)
                ? '重複の可能性が高い投稿があります。'
                : '少し似た投稿があります。'}
          </p>
          {result.matches.map((m) => (
            <div key={`${m.kind}-${m.id}`} className="rounded border border-neutral-200 bg-neutral-50 p-2 text-xs">
              <p className="text-neutral-500">
                類似度 {Math.round(m.score * 100)}% · {m.kind === 'idea' ? 'ネタ' : (STATUS[m.status] ?? m.status)}
                {m.scheduledAt ? ` · ${new Date(m.scheduledAt).toLocaleDateString('ja-JP')}` : ''}
              </p>
              <p className="line-clamp-3 text-neutral-800">{m.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
