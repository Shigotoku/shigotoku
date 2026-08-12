import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listIssuesRemote, listOrgFeedbackRemote, listPackMetaRemote } from "../lib/cloudStore";
import { buildFixPacks, splitPackIntoClusters, type FixPack } from "../lib/fixPacks";
import type { FixPackMeta } from "../lib/packMeta";
import type { Feedback, Issue } from "../lib/types";

/** 同一 URL のオープン Issue を束ねた「修正パック」一覧 */
export default function FixPacksPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [metaByKey, setMetaByKey] = useState<Record<string, FixPackMeta>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [i, f, metas] = await Promise.all([
          listIssuesRemote(),
          listOrgFeedbackRemote(),
          listPackMetaRemote(),
        ]);
        setIssues(i);
        setFeedback(f);
        const map: Record<string, FixPackMeta> = {};
        for (const m of metas) map[m.pageKey] = m;
        setMetaByKey(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const packs = useMemo(() => buildFixPacks(issues, feedback), [issues, feedback]);
  const maxUrgency = Math.max(1, ...packs.map((p) => p.urgencyScore));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Fix Packs</p>
        <h1 className="font-display mt-1 text-3xl font-bold">修正パック</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          同じ画面（URL）に溜まった問題を1まとまりにします。カテゴリが混ざる場合は自動でサブパックに分けます。
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-ink/55">
        <span>
          パック <strong className="tabular-nums text-ink">{packs.length}</strong>
        </span>
        <span>
          オープン問題{" "}
          <strong className="tabular-nums text-ink">
            {packs.reduce((s, p) => s + p.openIssueCount, 0)}
          </strong>
        </span>
        <span>
          報告合計{" "}
          <strong className="tabular-nums text-ink">
            {packs.reduce((s, p) => s + p.reportCount, 0)}
          </strong>
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-ink/50">集約中…</p>
      ) : packs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white px-6 py-10 text-sm text-ink/55">
          URL 付きのオープン Issue がまだありません。投稿 → Inbox で Issue 化すると、ここに画面単位で並びます。
          <div className="mt-3 flex gap-3">
            <Link to="/capture" className="text-mint hover:underline">
              投稿する
            </Link>
            <Link to="/inbox" className="text-mint hover:underline">
              Inbox
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {packs.map((pack) => (
            <PackRow
              key={pack.id}
              pack={pack}
              maxUrgency={maxUrgency}
              meta={metaByKey[pack.pageKey]}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

const WORK_LABEL = {
  open: "未着手",
  in_progress: "作業中",
  shipped: "出荷済",
} as const;

function PackRow({
  pack,
  maxUrgency,
  meta,
}: {
  pack: FixPack;
  maxUrgency: number;
  meta?: FixPackMeta;
}) {
  const intensity = pack.urgencyScore / maxUrgency;
  const clusters = splitPackIntoClusters(pack);
  return (
    <li
      className="rounded-xl border border-ink/10 px-4 py-3 transition hover:border-mint/40"
      style={{ background: `rgba(31, 111, 91, ${0.04 + intensity * 0.22})` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/fix-packs/${pack.id}`}
            className="break-all text-sm font-semibold text-ink hover:text-mint"
          >
            {pack.label}
          </Link>
          <p className="mt-1 line-clamp-1 break-all text-[11px] text-ink/45">{pack.sampleUrl}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pack.categories.slice(0, 4).map((c) => (
              <span
                key={c}
                className="rounded border border-ink/10 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-ink/60"
              >
                {c}
              </span>
            ))}
            <span className="rounded border border-ink/10 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-ink/60">
              {pack.maxSeverity}
            </span>
            {clusters.length > 1 && (
              <span className="rounded border border-mint/20 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-mint">
                {clusters.length} サブパック
              </span>
            )}
            {meta?.assignee && (
              <span className="rounded border border-ink/10 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-ink/60">
                {meta.assignee}
              </span>
            )}
            {meta?.workStatus && meta.workStatus !== "open" && (
              <span className="rounded border border-ink/10 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-ink/60">
                {WORK_LABEL[meta.workStatus]}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-lg font-semibold tabular-nums">{pack.openIssueCount}</span>
          <span className="text-[10px] text-ink/50">問題 · 報告 {pack.reportCount}</span>
          <Link
            to={`/fix-packs/${pack.id}`}
            className="mt-1 text-xs font-semibold text-mint hover:underline"
          >
            開いて直す
          </Link>
        </div>
      </div>
    </li>
  );
}
