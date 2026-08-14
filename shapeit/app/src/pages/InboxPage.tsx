import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
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
import { extractFeedbackTitle } from "../lib/feedbackTitle";
import { formatInTz, loadSettings } from "../lib/demoStore";
import { canTriage } from "../lib/roles";
import type { Feedback, Issue } from "../lib/types";
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
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
        <ul className="space-y-2">
          {sorted.map((fb) => (
            <InboxFeedbackCard
              key={fb.id}
              fb={fb}
              locale={locale}
              slaHours={slaHours}
              selected={selected.has(fb.id)}
              onToggleSelect={() => toggle(fb.id)}
              issues={issues}
              allFeedback={allFeedback}
              mergeTarget={mergeTarget[fb.id] ?? ""}
              onMergeTargetChange={(v) => setMergeTarget((m) => ({ ...m, [fb.id]: v }))}
              rejecting={rejectingId === fb.id}
              rejectReason={rejectReason}
              onRejectReasonChange={setRejectReason}
              onStartReject={() => {
                setRejectingId(fb.id);
                setRejectReason("");
              }}
              onRefresh={refresh}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function InboxFeedbackCard({
  fb,
  locale,
  slaHours,
  selected,
  onToggleSelect,
  issues,
  allFeedback,
  mergeTarget,
  onMergeTargetChange,
  rejecting,
  rejectReason,
  onRejectReasonChange,
  onStartReject,
  onRefresh,
}: {
  fb: Feedback;
  locale: ReturnType<typeof getLocale>;
  slaHours: number;
  selected: boolean;
  onToggleSelect: () => void;
  issues: Issue[];
  allFeedback: Feedback[];
  mergeTarget: string;
  onMergeTargetChange: (v: string) => void;
  rejecting: boolean;
  rejectReason: string;
  onRejectReasonChange: (v: string) => void;
  onStartReject: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const dups = findDuplicateCandidates(
    fb.rawText,
    issues,
    allFeedback.filter((x) => x.id !== fb.id),
  );
  const topIssueDup = dups.find((d) => d.kind === "issue");
  const overdue = Date.now() - new Date(fb.createdAt).getTime() > slaHours * 3600_000;
  const cardTitle = extractFeedbackTitle(fb.rawText, fb.analysis?.title);

  const toggleOpen = (e: MouseEvent | KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, textarea, select, audio")) return;
    setOpen((v) => !v);
  };

  const openPageUrl = (e: MouseEvent) => {
    e.stopPropagation();
    if (fb.pageUrl) window.open(fb.pageUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <li
      className={`rounded-lg border bg-white ${overdue ? "border-amber-300" : "border-ink/10"} ${open ? "shadow-sm" : ""}`}
    >
      <div
        className="flex cursor-pointer items-stretch gap-2 p-2"
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleOpen(e);
          }
        }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 shrink-0 self-start"
          aria-label="選択"
        />
        {fb.screenshotDataUrl ? (
          <button
            type="button"
            className="h-16 w-24 shrink-0 self-start overflow-hidden rounded border border-ink/10 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxUrl(fb.screenshotDataUrl!);
            }}
            aria-label="スクリーンショットを拡大"
          >
            <img src={fb.screenshotDataUrl} alt="" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="flex h-16 w-24 shrink-0 self-start items-center justify-center rounded border border-dashed border-ink/15 bg-paper text-[9px] text-ink/35">
            テキスト
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-stretch">
          <div className="min-w-0 lg:w-[32%] lg:shrink-0">
            <p className="text-base font-bold leading-snug text-ink sm:text-lg">{cardTitle}</p>
            {fb.pageTitle && (
              <p className="mt-1 truncate text-xs font-medium text-ink/55">{fb.pageTitle}</p>
            )}
            {fb.pageUrl && (
              <button
                type="button"
                onClick={openPageUrl}
                className="mt-1 block max-w-full truncate text-left text-xs text-mint hover:underline"
              >
                {fb.pageUrl}
              </button>
            )}
            <p className="mt-1 text-[10px] text-ink/45">
              <span className="font-medium text-ink/60">{authorLabel(fb)}</span>
              {" · "}
              {formatInTz(fb.createdAt)}
              {fb.source === "CHROME_EXTENSION"
                ? " · 拡張"
                : fb.source
                  ? ` · ${fb.source}`
                  : ""}
              {overdue && <span className="ml-1 text-amber-800">SLA超過</span>}
            </p>
          </div>
          <div className="min-w-0 flex-1 lg:border-l lg:border-ink/10 lg:pl-3">
            <p className="text-sm leading-relaxed text-ink/85 line-clamp-4 sm:text-[15px] sm:leading-6 lg:line-clamp-5">
              {fb.rawText}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 self-start text-ink/35 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </div>

      {open && (
        <div className="border-t border-ink/8 px-2 pb-2 pt-2">
          {fb.screenshotDataUrl && (
            <button
              type="button"
              className="block w-full"
              onClick={() => setLightboxUrl(fb.screenshotDataUrl!)}
              aria-label="スクリーンショットを拡大"
            >
              <img
                src={fb.screenshotDataUrl}
                alt=""
                className="max-h-64 w-full cursor-zoom-in rounded border border-ink/10 object-contain bg-paper"
              />
            </button>
          )}
          {fb.audioDataUrl && (
            <audio controls src={fb.audioDataUrl} className="mt-2 h-8 w-full max-w-md" />
          )}

          {dups.length > 0 && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/70 p-2 text-[11px] text-amber-950">
              <p className="font-semibold">重複候補</p>
              <ul className="mt-1 space-y-1">
                {dups.map((d) => (
                  <li key={`${d.kind}-${d.id}`}>
                    [{d.kind}] {d.title}（類似 {(d.score * 100).toFixed(0)}%）
                    {d.kind === "issue" && (
                      <Link to={`/issues/${d.id}`} className="ml-2 underline">
                        開く
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {topIssueDup && (
              <button
                type="button"
                className="rounded-md bg-mint px-2.5 py-1.5 text-[11px] font-semibold text-white"
                onClick={async () => {
                  await mergeIntoIssueRemote(fb.id, topIssueDup.id);
                  await onRefresh();
                }}
              >
                類似Issueへ統合
              </button>
            )}
            <button
              type="button"
              className="rounded-md border border-mint/30 bg-mint/5 px-2.5 py-1.5 text-[11px] font-semibold text-mint"
              onClick={async () => {
                await reanalyzeFeedbackRemote(fb.id);
                await onRefresh();
              }}
            >
              AI 再分析
            </button>
            <button
              type="button"
              className="rounded-md bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-paper"
              onClick={async () => {
                await acceptAsIssueRemote(fb.id);
                await onRefresh();
              }}
            >
              Todoへ
            </button>
            <select
              className="rounded-md border border-ink/15 px-2 py-1.5 text-[11px]"
              value={mergeTarget}
              onChange={(e) => onMergeTargetChange(e.target.value)}
            >
              <option value="">統合先を選択…</option>
              {issues
                .filter((i) => i.status !== "archived")
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!mergeTarget}
              className="rounded-md border border-ink/15 px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40"
              onClick={async () => {
                await mergeIntoIssueRemote(fb.id, mergeTarget);
                await onRefresh();
              }}
            >
              選択Issueへ統合
            </button>
            <button
              type="button"
              className="rounded-md border border-ink/15 px-2.5 py-1.5 text-[11px] font-semibold"
              onClick={async () => {
                await snoozeFeedbackRemote(fb.id, 24);
                await onRefresh();
              }}
            >
              24h Snooze
            </button>
            <button
              type="button"
              className="rounded-md border border-ink/15 px-2.5 py-1.5 text-[11px] font-semibold"
              onClick={async () => {
                const v = window.prompt(
                  "再表示日時 (YYYY-MM-DDTHH:mm)",
                  new Date(Date.now() + 86400_000).toISOString().slice(0, 16),
                );
                if (!v) return;
                await snoozeFeedbackRemote(fb.id, 24, new Date(v).toISOString());
                await onRefresh();
              }}
            >
              日時指定 Snooze
            </button>
            <button
              type="button"
              className="rounded-md border border-ink/15 px-2.5 py-1.5 text-[11px] font-semibold text-ink/60"
              onClick={onStartReject}
            >
              却下
            </button>
          </div>

          {rejecting && (
            <div className="mt-2 flex flex-wrap gap-2 rounded-md bg-paper p-2">
              <input
                value={rejectReason}
                onChange={(e) => onRejectReasonChange(e.target.value)}
                placeholder="却下理由（投稿者に表示）"
                className="min-w-[200px] flex-1 rounded-md border border-ink/10 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                className="rounded-md bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-paper"
                onClick={async () => {
                  await rejectFeedbackRemote(fb.id, rejectReason.trim() || "対象外");
                  await onRefresh();
                }}
              >
                理由付きで却下
              </button>
            </div>
          )}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="スクリーンショット"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            閉じる
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[92vh] max-w-[96vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </li>
  );
}

function authorLabel(fb: Feedback) {
  return fb.authorName?.trim() || fb.authorEmail?.trim() || "投稿者不明";
}
