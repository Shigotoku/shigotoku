import { useState } from "react";
import { Link } from "react-router-dom";
import { computeIceRanking, setEffort } from "../lib/demoStore";
import type { Effort } from "../lib/types";

/** PRI-004: Impact × Confidence / Effort ランキング */
export default function RankingPage() {
  const [, setTick] = useState(0);
  const rows = computeIceRanking();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Priority</p>
        <h1 className="font-display mt-1 text-3xl font-bold">ICE Ranking</h1>
        <p className="mt-2 text-sm text-ink/60">
          Impact × Confidence / Effort。Effort を変えると順位が更新されます。
        </p>
      </div>
      <ol className="space-y-2">
        {rows.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-sm text-ink/50">
            オープン Issue がありません。
          </li>
        ) : (
          rows.map((r, idx) => (
            <li
              key={r.issue.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3"
            >
              <span className="w-8 font-display text-lg font-bold tabular-nums text-ink/30">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link to={`/issues/${r.issue.id}`} className="font-semibold hover:underline">
                  {r.issue.title}
                </Link>
                <p className="text-xs text-ink/45">
                  {r.issue.category} · {r.issue.productArea}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(["S", "M", "L", "XL"] as Effort[]).map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        (r.issue.effort ?? "M") === e
                          ? "bg-mint text-white"
                          : "bg-sand text-ink/60"
                      }`}
                      onClick={() => {
                        setEffort(r.issue.id, e);
                        setTick((t) => t + 1);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold tabular-nums">ICE {r.ice.toFixed(1)}</p>
                <p className="text-ink/45">
                  I{r.impact} · C{r.confidence} · E{r.effort}
                </p>
              </div>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
