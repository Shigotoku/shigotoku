import { useState } from "react";
import { Link } from "react-router-dom";
import { computeDigest, formatInTz, generateWeeklyReviewText } from "../lib/demoStore";

export default function DigestPage() {
  const d = computeDigest();
  const [review] = useState(() => generateWeeklyReviewText());

  return (
    <div className="w-full space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Weekly</p>
          <h1 className="font-display mt-1 text-3xl font-bold">週次ダイジェスト</h1>
          <p className="mt-2 text-sm text-ink/60">直近7日 · {d.weekLabel} 時点</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold print:hidden"
          onClick={() => window.print()}
        >
          印刷 / PDF
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card label="新規 Feedback" value={d.newFeedbackCount} />
        <Card label="未 Triage" value={d.pendingTriage} />
        <Card label="Critical (S0/S1)" value={d.criticalCount} />
        <Card label="SLA超過" value={d.slaBreaches} />
        <Card label="再燃アラート" value={d.reopened} />
        <Card label="Auto-triage率" value={`${(d.autoTriageRate * 100).toFixed(0)}%`} />
      </div>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Weekly Product Review</h2>
          <button
            type="button"
            className="text-xs text-mint print:hidden"
            onClick={() => void navigator.clipboard.writeText(review)}
          >
            コピー
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-paper p-3 text-xs text-ink/75">
          {review}
        </pre>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-sm font-semibold">急増 Issue（報告数）</h2>
        <ul className="mt-3 space-y-2">
          {d.surging.length === 0 ? (
            <li className="text-xs text-ink/45">該当なし</li>
          ) : (
            d.surging.map((i) => (
              <li key={i.id} className="flex justify-between text-sm">
                <Link to={`/issues/${i.id}`} className="text-mint hover:underline">
                  {i.title}
                </Link>
                <span className="tabular-nums text-ink/50">{i.feedbackIds.length}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-sm font-semibold">Critical Issues</h2>
        <ul className="mt-3 space-y-2">
          {d.critical.length === 0 ? (
            <li className="text-xs text-ink/45">なし</li>
          ) : (
            d.critical.map((i) => (
              <li key={i.id} className="text-sm">
                <span className="mr-2 rounded bg-sand px-1.5 py-0.5 text-[10px] font-bold">
                  {i.severity}
                </span>
                <Link to={`/issues/${i.id}`} className="text-mint hover:underline">
                  {i.title}
                </Link>
                <span className="ml-2 text-xs text-ink/40">{formatInTz(i.updatedAt)}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
