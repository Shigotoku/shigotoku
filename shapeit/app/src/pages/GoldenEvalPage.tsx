import { useMemo, useState } from "react";
import { localTriage } from "../lib/triage";
import { findDuplicateCandidates } from "../lib/duplicates";
import { downloadText } from "../lib/export";
import type { Issue } from "../lib/types";

type Golden = {
  id: string;
  text: string;
  expectCategory: string;
  expectSeverity?: string;
};

const GOLDEN: Golden[] = [
  { id: "g1", text: "ログインできない。バグで落ちる", expectCategory: "BUG", expectSeverity: "S0" },
  { id: "g2", text: "画面が遅くてラグい", expectCategory: "PERFORMANCE" },
  { id: "g3", text: "文言がおかしい。タイポがある", expectCategory: "COPY" },
  { id: "g4", text: "ダークモード機能を追加してほしい要望", expectCategory: "FEATURE" },
  { id: "g5", text: "個人情報の漏洩が心配。セキュリティ", expectCategory: "SECURITY" },
  { id: "g6", text: "ボタンの意味が分かりにくい。使いにくい", expectCategory: "UX" },
];

const SCORE_KEY = "shapeit:golden-scores:v1";

/** AIQ-001: Golden set 回帰評価 */
export default function GoldenEvalPage() {
  const [ran, setRan] = useState(false);

  const results = useMemo(() => {
    if (!ran) return [];
    return GOLDEN.map((g) => {
      const a = localTriage(g.text);
      const catOk = a.category === g.expectCategory;
      const sevOk = !g.expectSeverity || a.severity === g.expectSeverity;
      return { ...g, gotCategory: a.category, gotSeverity: a.severity, ok: catOk && sevOk };
    });
  }, [ran]);

  const pass = results.filter((r) => r.ok).length;
  const dupSmoke = (() => {
    const issues: Issue[] = [
      {
        id: "x",
        title: "保存ボタンが分かりにくい",
        summary: "設定",
        category: "UX",
        severity: "S2",
        priorityScore: 40,
        status: "todo",
        productArea: "Settings",
        feedbackIds: [],
        createdAt: "",
        updatedAt: "",
      },
    ];
    return findDuplicateCandidates("保存ボタンが分かりにくい 設定", issues, []).length > 0;
  })();

  const history = (() => {
    try {
      return JSON.parse(localStorage.getItem(SCORE_KEY) || "[]") as {
        at: string;
        pass: number;
        total: number;
      }[];
    } catch {
      return [];
    }
  })();

  const persist = (p: number, total: number) => {
    const next = [{ at: new Date().toISOString(), pass: p, total }, ...history].slice(0, 20);
    localStorage.setItem(SCORE_KEY, JSON.stringify(next));
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">AI Quality</p>
        <h1 className="font-display mt-1 text-3xl font-bold">Golden Eval</h1>
        <p className="mt-2 text-sm text-ink/60">Category / Severity の回帰評価セット</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper"
          onClick={() => {
            setRan(true);
            // compute after render via timeout
            window.setTimeout(() => {
              const scored = GOLDEN.map((g) => {
                const a = localTriage(g.text);
                const catOk = a.category === g.expectCategory;
                const sevOk = !g.expectSeverity || a.severity === g.expectSeverity;
                return catOk && sevOk;
              });
              persist(scored.filter(Boolean).length, scored.length);
            }, 0);
          }}
        >
          評価を実行
        </button>
        {ran && (
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={() =>
              downloadText(
                "shapeit-golden-eval.json",
                JSON.stringify({ at: new Date().toISOString(), results, dupSmoke }, null, 2),
                "application/json",
              )
            }
          >
            結果をエクスポート
          </button>
        )}
      </div>
      {ran && (
        <>
          <p className="text-sm font-semibold">
            Score: {pass}/{results.length} · Duplicate smoke: {dupSmoke ? "PASS" : "FAIL"}
          </p>
          <ul className="space-y-2">
            {results.map((r) => (
              <li
                key={r.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  r.ok ? "border-mint/30 bg-sand/40" : "border-amber-300 bg-amber-50"
                }`}
              >
                <p className="font-medium">{r.text}</p>
                <p className="mt-1 text-xs text-ink/55">
                  expect {r.expectCategory}/{r.expectSeverity ?? "-"} · got {r.gotCategory}/
                  {r.gotSeverity}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      {history.length > 0 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-4 text-xs">
          <h2 className="font-semibold">過去スコア</h2>
          <ul className="mt-2 space-y-1 text-ink/60">
            {history.slice(0, 8).map((h) => (
              <li key={h.at}>
                {new Date(h.at).toLocaleString("ja-JP")} · {h.pass}/{h.total}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
