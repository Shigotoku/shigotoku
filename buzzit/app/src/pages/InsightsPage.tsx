import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import {
  analyzeInsights,
  fetchInsightsDashboard,
  type InsightsDashboard,
  type InsightsPlatformFilter,
} from '../lib/api';
import InsightsDashboardPanel from '../components/InsightsDashboardPanel';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePersona } from '../store/personaContext';

function parsePlatform(raw: string | null): InsightsPlatformFilter {
  if (raw === 'x' || raw === 'instagram' || raw === 'line' || raw === 'facebook') return raw;
  return 'all';
}

export default function InsightsPage() {
  const isMobile = useIsMobile();
  const { personas, activePersonaId, refreshPersonas } = usePersona();
  const [personaScope, setPersonaScope] = useState<string | 'all'>('active');

  useEffect(() => {
    refreshPersonas().catch(() => {});
  }, [refreshPersonas]);
  const [searchParams] = useSearchParams();
  const [platform, setPlatform] = useState<InsightsPlatformFilter>(() =>
    parsePlatform(searchParams.get('platform')),
  );
  const [dashboard, setDashboard] = useState<InsightsDashboard | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const resolvedPersonaId =
    personaScope === 'all' ? 'all' : personaScope === 'active' ? activePersonaId ?? undefined : personaScope;

  const loadDashboard = useCallback((p: InsightsPlatformFilter, personaId?: string | 'all') => {
    fetchInsightsDashboard(p, 30, personaId)
      .then((r) => {
        setDashboard(r.dashboard);
        setLoaded(true);
      })
      .catch(() => {
        setDashboard(null);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (personaScope !== 'all' && personaScope !== 'active' && !personaScope) return;
    loadDashboard(platform, resolvedPersonaId);
  }, [platform, personaScope, resolvedPersonaId, loadDashboard]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setMessage(null);
    try {
      const r = await analyzeInsights({ platform, force: true });
      setDashboard(r.dashboard);
      const fetched = (r.result as { fetched?: number })?.fetched ?? 0;
      setMessage(
        fetched > 0
          ? `${fetched} 件の投稿データを更新しました`
          : '解析を更新しました（新しい投稿データはありません）',
      );
    } catch {
      setMessage('解析の更新に失敗しました。SNS連携を確認してください。');
    }
    setAnalyzing(false);
  };

  return (
    <div className="buzz-page space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <BarChart3 className="h-6 w-6" />
            SNS解析
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Buffer / SocialDog 風のワンタップ解析。媒体別・全体をグラフで確認できます。
          </p>
        </div>
        {!isMobile && (
          <Link
            to="/analytics"
            className="shrink-0 text-xs text-violet-700 underline-offset-2 hover:underline"
          >
            詳細分析（LTV・トレンド）へ
          </Link>
        )}
      </div>

      {message && <p className="buzz-alert buzz-alert-info text-sm">{message}</p>}

      {personas.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">表示キャラ:</span>
          <select
            value={personaScope}
            onChange={(e) => setPersonaScope(e.target.value)}
            className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
          >
            <option value="active">現在のキャラ</option>
            <option value="all">すべて合算</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <InsightsDashboardPanel
        dashboard={dashboard}
        platform={platform}
        onPlatformChange={setPlatform}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />

      {loaded && isMobile && (
        <p className="text-center text-xs text-neutral-500">
          予約投稿は
          <Link to="/calendar" className="mx-1 text-violet-700 underline">
            カレンダー
          </Link>
          から
        </p>
      )}
    </div>
  );
}
