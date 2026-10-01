import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  computeDigest,
  computeIceRanking,
  listIssues,
  listPendingFeedback,
  loadSettings,
} from "../lib/demoStore";
import { t } from "../lib/i18n";

type Mode = "default" | "critical" | "idea" | "sla";

/** AIPM-001: 「今週何を直すべき？」根拠付き回答 */
export default function AskAiPage() {
  const [q, setQ] = useState("今週何を直すべき？");
  const [answer, setAnswer] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("default");

  const ask = (question = q, nextMode: Mode = "default") => {
    const ranking = computeIceRanking();
    const pending = listPendingFeedback().length;
    const digest = computeDigest();
    const critical = listIssues().filter((i) => i.severity === "S0" || i.severity === "S1");
    const ideas = ranking.filter((r) => r.issue.category === "FEATURE");
    const slaHours = loadSettings().triageSlaHours;

    let resolved: Mode = nextMode;
    if (nextMode === "default") {
      if (/critical|クリティカル|緊急/i.test(question)) resolved = "critical";
      else if (/idea|要望|ice/i.test(question)) resolved = "idea";
      else if (/sla|未.?triage|トリアージ/i.test(question)) resolved = "sla";
    }

    const lines: string[] = ["## 回答（ローカル根拠）", "", `質問: ${question}`, ""];

    if (resolved === "critical") {
      lines.push("### Critical（S0/S1）");
      if (critical.length === 0) lines.push("- なし");
      else {
        for (const c of critical.slice(0, 8)) {
          lines.push(`- [${c.severity}] ${c.title}（${c.status} · 報告${c.feedbackIds.length}）`);
        }
      }
      lines.push("", "推奨: Critical を Verify / Done まで運ぶ。");
    } else if (resolved === "idea") {
      lines.push("### Idea ICE 優先");
      if (ideas.length === 0) lines.push("- FEATURE Issue がありません");
      else {
        ideas.slice(0, 5).forEach((r, i) => {
          lines.push(
            `${i + 1}. ${r.issue.title} — ICE ${r.ice.toFixed(1)} / votes ${r.issue.votes ?? 0}`,
          );
        });
      }
    } else if (resolved === "sla") {
      lines.push(
        "### SLA / Triage",
        `- 未Triage: ${pending} 件（SLA ${slaHours}h）`,
        `- SLA超過: ${digest.slaBreaches} 件`,
        `- Auto-triage率: ${(digest.autoTriageRate * 100).toFixed(0)}%`,
        pending > 0 ? "推奨: Inbox を先に空にする" : "推奨: 実行ボードに集中",
      );
    } else {
      lines.push(
        "### 推奨アクション",
        pending > 0
          ? `1. Inbox の未Triage ${pending} 件を先に片付ける（SLA超過 ${digest.slaBreaches}）`
          : "1. Triage は空。実行に集中できる",
        critical.length > 0
          ? `2. Critical ${critical.length} 件（${critical
              .slice(0, 3)
              .map((c) => c.title)
              .join(" / ")}）を優先`
          : "2. Critical はなし",
        ranking[0]
          ? `3. ICE トップは「${ranking[0].issue.title}」（ICE ${ranking[0].ice.toFixed(1)}）`
          : "3. オープン Issue が少ない",
        digest.reopened > 0 ? `4. 再燃アラート ${digest.reopened} 件を確認` : "4. 再燃なし",
        "",
        "### 参照 Issue",
      );
      ranking.slice(0, 5).forEach((r, i) => {
        lines.push(
          `${i + 1}. ${r.issue.title} — P${r.impact} / Effort ${r.issue.effort ?? "M"} / 報告${r.issue.feedbackIds.length}`,
        );
      });
      lines.push(
        "",
        "### 週次コンテキスト",
        `- 新規 Feedback: ${digest.newFeedbackCount}`,
        `- Critical: ${digest.criticalCount}`,
        `- 急増: ${digest.surging.map((s) => s.title).slice(0, 3).join(", ") || "なし"}`,
      );
    }

    setMode(resolved);
    setAnswer(lines.join("\n"));
  };

  const refs = useMemo(() => {
    if (mode === "critical") {
      return listIssues()
        .filter((i) => i.severity === "S0" || i.severity === "S1")
        .slice(0, 5)
        .map((issue) => ({ issue }));
    }
    if (mode === "idea") {
      return computeIceRanking()
        .filter((r) => r.issue.category === "FEATURE")
        .slice(0, 5);
    }
    return computeIceRanking().slice(0, 5);
  }, [answer, mode]);

  const chips: { label: string; mode: Mode }[] = [
    { label: "今週何を直すべき？", mode: "default" },
    { label: "Critical は？", mode: "critical" },
    { label: "Idea で優先すべきは？", mode: "idea" },
    { label: "SLA / 未Triage は？", mode: "sla" },
  ];

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_ask")}</p>
        <h1 className="font-display mt-1 text-3xl font-bold">{t("page_ask")}</h1>
        <p className="mt-2 text-sm text-ink/60">根拠付きで「次に何を直すべきか」を提案します（ローカル）。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[220px] flex-1 rounded-xl border border-ink/15 px-3 py-2 text-sm"
          aria-label="質問"
          onKeyDown={(e) => {
            if (e.key === "Enter") ask();
          }}
        />
        <button
          type="button"
          className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
          onClick={() => ask()}
        >
          聞く
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((s) => (
          <button
            key={s.label}
            type="button"
            className="rounded-full bg-sand px-3 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint"
            onClick={() => {
              setQ(s.label);
              ask(s.label, s.mode);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {answer && (
        <pre
          className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink/80"
          aria-live="polite"
        >
          {answer}
        </pre>
      )}
      {refs.length > 0 && answer && (
        <ul className="space-y-2 text-sm">
          {refs.map((r) => (
            <li key={r.issue.id}>
              <Link to={`/issues/${r.issue.id}`} className="text-mint hover:underline">
                {r.issue.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
