import { useEffect, useState } from 'react';
import { MapPin, Star, TrendingUp, MessageSquare, RefreshCw } from 'lucide-react';
import { fetchGbpInsights, draftGbpReviewReply } from '../lib/api';
import PlanLockNotice from '../components/PlanLockNotice';
import EmptyState from '../components/EmptyState';
import { useApp } from '../store/appContext';

export default function MeoDashboardPage() {
  const { plan } = useApp();
  const [insights, setInsights] = useState<{ views: number; searches: number; actions: number } | null>(null);
  const [reviews, setReviews] = useState<
    Array<{ id: string; reviewer: string; comment: string; starRating: string; createTime: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchGbpInsights()
      .then((r) => {
        setInsights(r.insights);
        setReviews(r.reviews);
      })
      .catch(() => {
        setInsights(null);
        setReviews([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDraftReply = async (reviewId: string, text: string) => {
    setBusyId(reviewId);
    try {
      const r = await draftGbpReviewReply(text);
      setReplyDraft((prev) => ({ ...prev, [reviewId]: r.reply }));
    } catch {
      setReplyDraft((prev) => ({ ...prev, [reviewId]: '返信の生成に失敗しました' }));
    }
    setBusyId(null);
  };

  if (!['growth', 'enterprise'].includes(plan)) {
    return (
      <div className="buzz-page">
        <PlanLockNotice feature="hpb" currentPlan={plan} />
        <p className="mt-4 text-sm text-neutral-600">
          MEOダッシュボードは Growth OS 以上で利用できます。GBP連携後、閲覧数・クチコミのAI返信ドラフトを一元管理できます。
        </p>
      </div>
    );
  }

  return (
    <div className="buzz-page space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">MEOダッシュボード</h1>
          <p className="text-sm text-neutral-600">Googleマップの閲覧・クチコミ・来店アクションを可視化</p>
        </div>
        <button type="button" onClick={load} className="buzz-btn-secondary inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          更新
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">読み込み中…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="buzz-card-pad">
              <div className="flex items-center gap-2 text-neutral-500">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">マップ表示（28日）</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{insights?.views?.toLocaleString() ?? '—'}</p>
            </div>
            <div className="buzz-card-pad">
              <div className="flex items-center gap-2 text-neutral-500">
                <MapPin className="h-4 w-4" />
                <span className="text-xs font-medium">検索表示</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{insights?.searches?.toLocaleString() ?? '—'}</p>
            </div>
            <div className="buzz-card-pad">
              <div className="flex items-center gap-2 text-neutral-500">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs font-medium">電話タップ等</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{insights?.actions?.toLocaleString() ?? '—'}</p>
            </div>
          </div>

          <div className="buzz-card-pad">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Star className="h-5 w-5" />
              クチコミ
            </h2>
            {reviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="クチコミはまだありません"
                description="設定で Google Business Profile をOAuth連携すると、ここにクチコミが表示されます。"
                primaryLabel="設定でGBP連携"
                primaryTo="/settings?tab=sns"
              />
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="buzz-surface p-4 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{r.reviewer}</p>
                      <span className="text-xs text-neutral-500">{r.starRating.replace('STAR_RATING_', '')}★</span>
                    </div>
                    <p className="mt-2 text-neutral-700">{r.comment || '（コメントなし）'}</p>
                    {replyDraft[r.id] ? (
                      <p className="mt-3 border-l-2 border-violet-200 pl-3 text-neutral-600">{replyDraft[r.id]}</p>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => handleDraftReply(r.id, r.comment)}
                        className="mt-3 text-xs font-medium text-violet-700 underline-offset-2 hover:underline"
                      >
                        {busyId === r.id ? 'AI返信を生成中…' : 'AI返信ドラフトを生成'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
