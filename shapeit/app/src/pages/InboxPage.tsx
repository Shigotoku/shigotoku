import { Link } from "react-router-dom";
import {
  acceptAsIssueRemote,
  listIssuesRemote,
  listMyFeedbackRemote,
  listPendingFeedbackRemote,
  mergeIntoIssueRemote,
  rejectFeedbackRemote,
  reanalyzeFeedbackRemote,
  snoozeFeedbackRemote,
} from "../lib/cloudStore";
import { findDuplicateCandidates } from "../lib/duplicates";
import { formatInTz, loadSettings } from "../lib/demoStore";
import { canTriage } from "../lib/roles";
import type { Feedback, Issue } from "../lib/types";
import { useEffect, useMemo, useState } from "react";
import { getLocale, t } from "../lib/i18n";

type SortKey = "date" | "priority" | "severity" | "confidence";

export default function InboxPage() {
  const locale = useLocale();
  if (!canTriage()) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-sm text-ink/60">
        {t("inbox_role_required", locale)}
        <Link to="/settings" className="ml-1 text-mint hover:underline">
          {t("inbox_role_settings", locale)}
        </Link>
      </div>
    );
  }

  return <InboxInner locale={locale} />;
}

function useLocale() {
  const [locale, setLocale] = useState(getLocale());
  useEffect(() => {
    const onLocale = () => setLocale(getLocale());
    window.addEventListener("shapeit-locale", onLocale);
    return () => window.removeEventListener("shapeit-locale", onLocale);
  }, []);
  return locale;
}

function InboxInner({ locale }: { locale: ReturnType<typeof getLocale> }) {
  const [pending, setPending] = useState<Feedback[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [sort, setSort] = useState<SortKey>("priority");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});
  const slaHours = loadSettings().triageSlaHours;

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, i, all] = await Promise.all([
        listPendingFeedbackRemote(),
        listIssuesRemote(),
        listMyFeedbackRemote(),
      ]);
      setPending(p);
      setIssues(i);
      setAllFeedback(all);
      setSelected(new Set());
    } catch (err) {
      console.error("inbox refresh", err);
      setError(t("inbox_load_error", locale));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [locale]);

  const sorted = useMemo(() => {
    const sev = { S0: 0, S1: 1, S2: 2, S3: 3 };
    return [...pending].sort((a, b) => {
      if (sort === "date") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "priority")
        return (b.analysis?.priorityScore ?? 0) - (a.analysis?.priorityScore ?? 0);
      if (sort === "severity")
        return (sev[a.analysis?.severity ?? "S3"] ?? 9) - (sev[b.analysis?.severity ?? "S3"] ?? 9);
      return (b.analysis?.confidence ?? 0) - (a.analysis?.confidence ?? 0);
    });
  }, [pending, sort]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulk = async (action: "todo" | "snooze" | "reject") => {
    for (const id of selected) {
      if (action === "todo") await acceptAsIssueRemote(id);
      if (action === "snooze") await snoozeFeedbackRemote(id, 24);
      if (action === "reject") await rejectFeedbackRemote(id, "一括却下");
    }
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_inbox", locale)}</p>
          <h1 className="font-display mt-1 text-3xl font-bold">{t("inbox_title", locale)}</h1>
          <p className="mt-2 text-sm text-ink/60">
            {t("inbox_pending_count", locale)} {pending.length} {t("inbox_items", locale)} · {t("inbox_sla", locale)} {slaHours}h
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="priority">{t("inbox_sort_priority", locale)}</option>
            <option value="severity">{t("inbox_sort_severity", locale)}</option>
            <option value="confidence">{t("inbox_sort_confidence", locale)}</option>
            <option value="date">{t("inbox_sort_date", locale)}</option>
          </select>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
          >
            {t("inbox_refresh", locale)}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-mint/30 bg-sand px-3 py-2 text-xs">
          <span className="font-semibold">{selected.size} 件選択</span>
          <button type="button" className="rounded-lg bg-ink px-2 py-1 text-paper" onClick={() => void bulk("todo")}>
            一括 Todo
          </button>
          <button type="button" className="rounded-lg border border-ink/15 px-2 py-1" onClick={() => void bulk("snooze")}>
            一括 Snooze
          </button>
          <button type="button" className="rounded-lg border border-ink/15 px-2 py-1" onClick={() => void bulk("reject")}>
            一括却下
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink/50">{t("loading", locale)}</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-sm text-ink/60">
          {t("inbox_empty", locale)}
          <Link to="/capture" className="font-medium text-mint hover:underline">{t("inbox_capture_link", locale)}</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((fb) => {
            const dups = findDuplicateCandidates(
              fb.rawText,
              issues,
              allFeedback.filter((x) => x.id !== fb.id),
            );
            const topIssueDup = dups.find((d) => d.kind === "issue");
            const overdue = Date.now() - new Date(fb.createdAt).getTime() > slaHours * 3600_000;
            return (
              <li key={fb.id} className={`rounded-xl border bg-white p-3 ${overdue ? "border-amber-300" : "border-ink/10"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 gap-2">
                    <input type="checkbox" checked={selected.has(fb.id)} onChange={() => toggle(fb.id)} className="mt-0.5" />
                    <div className="min-w-0">
                      <h2 className="font-display text-base font-semibold leading-snug">{fb.analysis?.title ?? "分析中"}</h2>
                      <p className="mt-0.5 text-sm text-ink/70 line-clamp-2">{fb.analysis?.summary}</p>
                      {fb.adminSummary && (
                        <p className="mt-0.5 text-xs text-ink/55 line-clamp-1">管理者要約: {fb.adminSummary}</p>
                      )}
                      <p className="mt-1 text-xs text-ink/45 line-clamp-2">原文: {fb.rawText}</p>
                      {fb.pageUrl && <p className="mt-0.5 break-all text-[11px] text-mint/80 line-clamp-1">{fb.pageUrl}</p>}
                      <p className="mt-0.5 text-[10px] text-ink/40">
                        {formatInTz(fb.createdAt)}
                        {fb.detectedLang ? ` · lang ${fb.detectedLang}` : ""}
                        {fb.source ? ` · ${fb.source}` : ""}
                      </p>
                      {overdue && <p className="mt-1 text-xs font-medium text-amber-800">SLA超過</p>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-ink/55">
                    <p>{fb.analysis?.category} / {fb.analysis?.severity}</p>
                    <p className="font-semibold text-ink">P{fb.analysis?.priorityScore}</p>
                    <p>conf {(fb.analysis?.confidence ?? 0).toFixed(2)}</p>
                    {fb.analysis?.severityReason && (
                      <p className="mt-1 max-w-[12rem] text-[10px] text-ink/40">{fb.analysis.severityReason}</p>
                    )}
                  </div>
                </div>
                {fb.analysis?.priorityReasons && (
                  <ul className="mt-2 space-y-0.5 text-[11px] text-ink/55">
                    {fb.analysis.priorityReasons.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                )}
                {dups.length > 0 && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-[11px] text-amber-950">
                    <p className="font-semibold">重複候補</p>
                    <ul className="mt-1 space-y-1">
                      {dups.map((d) => (
                        <li key={`${d.kind}-${d.id}`}>
                          [{d.kind}] {d.title}（類似 {(d.score * 100).toFixed(0)}%）
                          {d.kind === "issue" && (
                            <Link to={`/issues/${d.id}`} className="ml-2 underline">開く</Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fb.screenshotDataUrl && (
                  <img src={fb.screenshotDataUrl} alt="" className="mt-2 max-h-28 rounded-md border border-ink/10 object-contain" />
                )}
                {fb.audioDataUrl && (
                  <audio controls src={fb.audioDataUrl} className="mt-2 w-full max-w-sm h-8" />
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topIssueDup && (
                    <button
                      type="button"
                      className="rounded-lg bg-mint px-3 py-2 text-xs font-semibold text-white"
                      onClick={async () => {
                        await mergeIntoIssueRemote(fb.id, topIssueDup.id);
                        await refresh();
                      }}
                    >
                      類似Issueへ統合
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-lg border border-mint/30 bg-mint/5 px-3 py-2 text-xs font-semibold text-mint"
                    onClick={async () => {
                      await reanalyzeFeedbackRemote(fb.id);
                      await refresh();
                    }}
                  >
                    AI 再分析
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper"
                    onClick={async () => {
                      await acceptAsIssueRemote(fb.id);
                      await refresh();
                    }}
                  >
                    Todoへ
                  </button>
                  <select
                    className="rounded-lg border border-ink/15 px-2 py-2 text-xs"
                    value={mergeTarget[fb.id] ?? ""}
                    onChange={(e) => setMergeTarget((m) => ({ ...m, [fb.id]: e.target.value }))}
                  >
                    <option value="">統合先を選択…</option>
                    {issues.filter((i) => i.status !== "archived").map((i) => (
                      <option key={i.id} value={i.id}>{i.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!mergeTarget[fb.id]}
                    className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold disabled:opacity-40"
                    onClick={async () => {
                      await mergeIntoIssueRemote(fb.id, mergeTarget[fb.id]);
                      await refresh();
                    }}
                  >
                    選択Issueへ統合
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
                    onClick={async () => {
                      await snoozeFeedbackRemote(fb.id, 24);
                      await refresh();
                    }}
                  >
                    24h Snooze
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
                    onClick={async () => {
                      const v = window.prompt("再表示日時 (YYYY-MM-DDTHH:mm)", new Date(Date.now() + 86400_000).toISOString().slice(0, 16));
                      if (!v) return;
                      await snoozeFeedbackRemote(fb.id, 24, new Date(v).toISOString());
                      await refresh();
                    }}
                  >
                    日時指定 Snooze
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold text-ink/60"
                    onClick={() => {
                      setRejectingId(fb.id);
                      setRejectReason("");
                    }}
                  >
                    却下
                  </button>
                </div>
                {rejectingId === fb.id && (
                  <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-paper p-3">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="却下理由（投稿者に表示）"
                      className="min-w-[200px] flex-1 rounded-lg border border-ink/10 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper"
                      onClick={async () => {
                        await rejectFeedbackRemote(fb.id, rejectReason.trim() || "対象外");
                        setRejectingId(null);
                        await refresh();
                      }}
                    >
                      理由付きで却下
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
