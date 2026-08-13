import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listIssuesRemote, listMyFeedbackRemote, listChangelogRemote } from "../lib/cloudStore";
import { computeInsights, listCorrections, loadSettings } from "../lib/demoStore";
import type { Feedback, Issue } from "../lib/types";
import { useAuth } from "../components/AuthProvider";
import { t } from "../lib/i18n";

type Insights = ReturnType<typeof computeInsights>;

function computeFromRemote(feedback: Feedback[], issues: Issue[], changelogCount: number): Insights {
  const byArea: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byUrl: Record<string, number> = {};
  for (const i of issues) {
    byArea[i.productArea] = (byArea[i.productArea] ?? 0) + 1;
    byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
  }
  for (const f of feedback) {
    if (!f.pageUrl) continue;
    try {
      const path = new URL(f.pageUrl).pathname || f.pageUrl;
      byUrl[path] = (byUrl[path] ?? 0) + 1;
    } catch {
      byUrl[f.pageUrl] = (byUrl[f.pageUrl] ?? 0) + 1;
    }
  }
  const resolved = issues.filter((i) => i.status === "done" || i.status === "archived").length;
  const pending = feedback.filter((f) => f.triageStatus === "pending" || f.triageStatus === "snoozed").length;
  const merged = feedback.filter((f) => f.triageStatus === "merged").length;
  const autoTriaged = feedback.filter((f) => f.autoTriaged).length;
  const doneIssues = issues.filter((i) => i.status === "done");
  const hours = doneIssues
    .map((i) => (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / 3600_000)
    .filter((h) => h >= 0)
    .sort((a, b) => a - b);
  const slaHours = loadSettings().triageSlaHours;
  const slaBreaches = feedback.filter((f) => {
    if (f.triageStatus !== "pending") return false;
    return Date.now() - new Date(f.createdAt).getTime() > slaHours * 3600_000;
  }).length;
  const authors = new Set(feedback.map((f) => f.authorName));

  return {
    feedbackCount: feedback.length,
    issueCount: issues.length,
    pendingTriage: pending,
    resolved,
    duplicateRate: feedback.length ? merged / feedback.length : 0,
    autoTriageRate: feedback.length ? autoTriaged / feedback.length : 0,
    aiAcceptanceHint: 0,
    correctionCount: 0,
    uniqueAuthors: authors.size,
    medianResolutionHours: hours.length ? hours[Math.floor(hours.length / 2)] : null,
    changelogCount,
    slaBreaches,
    byArea,
    byCategory,
    byUrl,
    openByStatus: {
      todo: issues.filter((i) => i.status === "todo").length,
      in_progress: issues.filter((i) => i.status === "in_progress").length,
      review: issues.filter((i) => i.status === "review").length,
      verify: issues.filter((i) => i.status === "verify").length,
    },
  };
}

export default function InsightsPage() {
  const { mode } = useAuth();
  const [data, setData] = useState<Insights | null>(null);

  const reload = async () => {
    if (mode === "demo") {
      setData(computeInsights());
      return;
    }
    const [feedback, issues, changelog] = await Promise.all([
      listMyFeedbackRemote(),
      listIssuesRemote(),
      listChangelogRemote(),
    ]);
    setData(computeFromRemote(feedback, issues, changelog.length));
  };

  useEffect(() => {
    void reload();
  }, [mode]);

  if (!data) return <p className="text-sm text-ink/50">集計中…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_insights")}</p>
          <h1 className="font-display mt-1 text-3xl font-bold">{t("page_insights")}</h1>
          <p className="mt-2 text-sm text-ink/60">KPI / Area / URL 密度 / auto-triage 率</p>
        </div>
        <button type="button" className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold" onClick={() => void reload()}>
          再集計
        </button>
      </div>

      {data.slaBreaches > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          未Triage SLA超過: {data.slaBreaches} 件
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Feedback" value={data.feedbackCount} />
        <Stat label="Issues" value={data.issueCount} />
        <Stat label="未Triage" value={data.pendingTriage} />
        <Stat label="Resolved" value={data.resolved} />
        <Stat label="Duplicate率" value={`${(data.duplicateRate * 100).toFixed(0)}%`} />
        <Stat label="Auto-triage率" value={`${(data.autoTriageRate * 100).toFixed(0)}%`} />
        <Stat
          label="Median解決時間"
          value={data.medianResolutionHours == null ? "—" : `${data.medianResolutionHours.toFixed(1)}h`}
        />
        <Stat label="AI修正シグナル" value={data.correctionCount} />
        <Stat label="投稿者数（健全指標）" value={data.uniqueAuthors} />
        <Stat
          label="AI修正 / 受理"
          value={`${(data.aiAcceptanceHint * 100).toFixed(0)}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarBlock title="Product Area" data={data.byArea} />
        <BarBlock title="Category" data={data.byCategory} />
      </div>
      <BarBlock title="URL / ルート密度" data={data.byUrl} />

      {mode === "demo" && listCorrections().length > 0 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="text-sm font-semibold">最近の AI 修正シグナル</h2>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
            {listCorrections()
              .slice(0, 12)
              .map((c) => (
                <li key={c.id} className="rounded-lg bg-paper px-3 py-2">
                  <Link to={`/issues/${c.issueId}`} className="text-mint hover:underline">
                    {c.field}
                  </Link>
                  : {c.before} → {c.after}
                </li>
              ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-ink/50">
        <Link to="/digest" className="text-mint hover:underline">週次ダイジェスト</Link>
        {" · "}
        <Link to="/heatmap" className="text-mint hover:underline">Heatmap</Link>
        {" · "}
        <Link to="/board" className="text-mint hover:underline">Board</Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function BarBlock({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-xs text-ink/45">データなし</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map(([k, v]) => (
            <li key={k}>
              <div className="flex justify-between gap-2 text-xs">
                <span className="truncate">{k}</span>
                <span className="shrink-0 tabular-nums text-ink/50">{v}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
                <div className="h-full rounded-full bg-mint" style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
