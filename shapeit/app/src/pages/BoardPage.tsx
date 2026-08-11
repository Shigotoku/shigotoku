import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createManualIssueRemote, listIssuesRemote, updateIssueStatusRemote } from "../lib/cloudStore";
import {
  deleteSavedView,
  listSavedViews,
  saveSavedView,
  type SavedView,
} from "../lib/demoStore";
import type { Issue, IssueStatus } from "../lib/types";
import { t } from "../lib/i18n";

const COLUMNS: { id: IssueStatus; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "verify", label: "Verify" },
  { id: "done", label: "Done" },
  { id: "archived", label: "Archived" },
];

export default function BoardPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [area, setArea] = useState(() => params.get("area") || "all");
  const [assignee, setAssignee] = useState("all");
  const [minPriority, setMinPriority] = useState("");
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [views, setViews] = useState<SavedView[]>([]);

  const refresh = async () => {
    setIssues(await listIssuesRemote());
    setViews(listSavedViews());
  };
  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const a = params.get("area");
    if (a) setArea(a);
  }, [params]);

  const areas = useMemo(
    () => Array.from(new Set(issues.map((i) => i.productArea).filter(Boolean))),
    [issues],
  );
  const assignees = useMemo(
    () => Array.from(new Set(issues.map((i) => i.assignee).filter(Boolean) as string[])),
    [issues],
  );

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (!showArchived && i.status === "archived") return false;
      if (category !== "all" && i.category !== category) return false;
      if (severity !== "all" && i.severity !== severity) return false;
      if (area !== "all" && i.productArea !== area) return false;
      if (assignee === "unassigned" && i.assignee) return false;
      if (assignee !== "all" && assignee !== "unassigned" && i.assignee !== assignee) return false;
      const p = i.priorityOverride ?? i.priorityScore;
      if (minPriority && p < Number(minPriority)) return false;
      if (q && !`${i.title} ${i.summary}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [issues, category, severity, area, assignee, minPriority, q, showArchived]);

  const onDrop = async (status: IssueStatus) => {
    if (!dragging) return;
    await updateIssueStatusRemote(dragging, status);
    setDragging(null);
    await refresh();
  };

  const moveFocused = async (dir: -1 | 1) => {
    if (!focusId) return;
    const issue = issues.find((i) => i.id === focusId);
    if (!issue) return;
    const order = cols.map((c) => c.id);
    const cur = order.indexOf(issue.status);
    if (cur < 0) return;
    const next = order[Math.max(0, Math.min(order.length - 1, cur + dir))];
    if (next === issue.status) return;
    await updateIssueStatusRemote(focusId, next);
    await refresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable))
        return;
      if (!focusId) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        void moveFocused(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        void moveFocused(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const applyView = (v: SavedView) => {
    setCategory(v.category);
    setSeverity(v.severity);
    setArea(v.area);
    setAssignee(v.assignee || "all");
    setMinPriority(v.minPriority || "");
    setQ(v.q);
  };

  const cols = showArchived ? COLUMNS : COLUMNS.filter((c) => c.id !== "archived");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Board</p>
          <h1 className="font-display mt-1 text-3xl font-bold">{t("board_title")}</h1>
          <p className="mt-1 text-xs text-ink/50">{t("board_subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/fix-packs"
            className="rounded-lg border border-mint/30 bg-mint/5 px-3 py-2 text-xs font-semibold text-mint"
          >
            修正パックでまとめて直す
          </Link>
          <label className="inline-flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Archived 表示
          </label>
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={async () => {
              const title = window.prompt("Issue タイトル");
              if (!title?.trim()) return;
              await createManualIssueRemote({ title: title.trim(), summary: title.trim() });
              await refresh();
            }}
          >
            手動で Issue 作成
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="検索" className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs" />
        <select className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Category</option>
          {["BUG", "UX", "UI", "FEATURE", "COPY", "PERFORMANCE", "SECURITY", "OTHER"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="all">Severity</option>
          {["S0", "S1", "S2", "S3"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="all">Product Area</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="all">Assignee</option>
          <option value="unassigned">未アサイン</option>
          {assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={100}
          value={minPriority}
          onChange={(e) => setMinPriority(e.target.value)}
          placeholder="Min P"
          className="w-20 rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs"
        />
        <button
          type="button"
          className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
          onClick={() => {
            const name = window.prompt("View 名", "My view");
            if (!name?.trim()) return;
            saveSavedView({
              name: name.trim(),
              category,
              severity,
              area,
              assignee,
              minPriority,
              q,
            });
            setViews(listSavedViews());
          }}
        >
          フィルタを保存
        </button>
      </div>

      {views.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {views.map((v) => (
            <div key={v.id} className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-1 text-xs">
              <button type="button" className="font-medium hover:underline" onClick={() => applyView(v)}>
                {v.name}
              </button>
              <button
                type="button"
                className="text-ink/40 hover:text-ink"
                aria-label="削除"
                onClick={() => {
                  deleteSavedView(v.id);
                  setViews(listSavedViews());
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {cols.map((col) => {
          const items = filtered.filter((i) => i.status === col.id);
          return (
            <div
              key={col.id}
              className="w-56 shrink-0 rounded-xl border border-ink/10 bg-white p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onDrop(col.id)}
              role="list"
              aria-label={col.label}
            >
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-ink/50">
                {col.label} · {items.length}
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {items.map((issue) => (
                  <li
                    key={issue.id}
                    draggable
                    tabIndex={0}
                    role="listitem"
                    onDragStart={() => setDragging(issue.id)}
                    onFocus={() => setFocusId(issue.id)}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/issues/${issue.id}`);
                    }}
                    className={`cursor-pointer rounded-lg border bg-paper px-2.5 py-2 transition-colors hover:border-mint/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint active:cursor-grabbing ${
                      focusId === issue.id
                        ? "border-mint"
                        : !issue.assignee
                          ? "border-amber-200"
                          : "border-sand"
                    }`}
                  >
                    <p className="text-sm font-semibold leading-snug text-ink line-clamp-2">{issue.title}</p>
                    <p className="mt-0.5 text-[10px] text-ink/50">
                      {issue.category} · P{issue.priorityOverride ?? issue.priorityScore} · 報告
                      {issue.feedbackIds.length}
                    </p>
                    <p className={`text-[10px] ${issue.assignee ? "text-ink/45" : "font-medium text-amber-700"}`}>
                      {issue.assignee || "未アサイン"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-ink/40">
        横スクロールで列を移動。PC ではカード選択後 ←→ でも列移動できます。
      </p>
    </div>
  );
}
