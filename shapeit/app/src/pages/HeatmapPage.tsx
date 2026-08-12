import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listIssuesRemote, listOrgFeedbackRemote } from "../lib/cloudStore";
import { canonicalizePageKey, encodePackId, pageKeyLabel } from "../lib/pageKey";
import type { Feedback, Issue } from "../lib/types";

type Mode = "url" | "area";

/** PI-004 / ANA-002: URL / Product Area ヒートマップ → 修正パックへ誘導 */
export default function HeatmapPage() {
  const [mode, setMode] = useState<Mode>("url");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    void (async () => {
      const [i, f] = await Promise.all([listIssuesRemote(), listOrgFeedbackRemote()]);
      setIssues(i);
      setFeedback(f);
    })();
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, number>();
    if (mode === "url") {
      for (const f of feedback) {
        const key = canonicalizePageKey(f.pageUrl);
        if (!key) continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    } else {
      for (const i of issues) {
        const area = i.productArea || "(未設定)";
        map.set(area, (map.get(area) ?? 0) + (i.feedbackIds.length || 1));
      }
      for (const f of feedback) {
        if (f.issueId) continue;
        const area = f.analysis?.productArea || "(未設定)";
        map.set(area, (map.get(area) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [mode, issues, feedback]);

  const max = Math.max(1, ...rows.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Analytics</p>
          <h1 className="font-display mt-1 text-3xl font-bold">Heatmap</h1>
          <p className="mt-2 text-sm text-ink/60">
            報告密度 — 痛い画面は{" "}
            <Link to="/fix-packs" className="text-mint hover:underline">
              修正パック
            </Link>{" "}
            でまとめて直せます
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-ink/10 bg-white p-1 text-xs">
          {(
            [
              ["url", "URL"],
              ["area", "Product Area"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-md px-3 py-1.5 font-semibold ${
                mode === id ? "bg-mint text-white" : "text-ink/60"
              }`}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-ink/50">データがありません。</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(([key, count]) => {
            const intensity = count / max;
            const label = mode === "url" ? pageKeyLabel(key) : key;
            const href =
              mode === "url"
                ? `/fix-packs/${encodePackId(key)}`
                : `/board?area=${encodeURIComponent(key)}`;
            return (
              <li
                key={key}
                className="rounded-xl border border-ink/10 px-4 py-3"
                style={{ background: `rgba(31, 111, 91, ${0.08 + intensity * 0.35})` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="break-all font-medium">{label}</span>
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 tabular-nums font-semibold">{count}</span>
                    <Link to={href} className="text-xs text-mint hover:underline">
                      {mode === "url" ? "修正パック" : "開く"}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
