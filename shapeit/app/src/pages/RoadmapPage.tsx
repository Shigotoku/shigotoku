import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listIssuesRemote, updateIssueRemote } from "../lib/cloudStore";
import type { Issue, RoadmapBucket } from "../lib/types";

const COLS: { id: RoadmapBucket; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "next", label: "Next" },
  { id: "later", label: "Later" },
  { id: "none", label: "Unassigned" },
];

/** RDM-001: Now / Next / Later */
export default function RoadmapPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [featuresOnly, setFeaturesOnly] = useState(false);

  const reload = async () => setIssues(await listIssuesRemote());
  useEffect(() => {
    void reload();
  }, []);

  const onDrop = async (bucket: RoadmapBucket) => {
    if (!dragging) return;
    await updateIssueRemote(dragging, { roadmapBucket: bucket });
    setDragging(null);
    await reload();
  };

  const moveFocused = async (dir: -1 | 1) => {
    if (!focusId) return;
    const issue = issues.find((i) => i.id === focusId);
    if (!issue) return;
    const order: RoadmapBucket[] = ["now", "next", "later", "none"];
    const cur = order.indexOf(issue.roadmapBucket ?? "none");
    const next = order[Math.max(0, Math.min(order.length - 1, cur + dir))];
    await updateIssueRemote(focusId, { roadmapBucket: next });
    await reload();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Roadmap</p>
          <h1 className="font-display mt-1 text-3xl font-bold">Now / Next / Later</h1>
          <p className="mt-2 text-sm text-ink/60">
            DnD またはカード選択＋←→ で移動。Unassigned 列あり。
          </p>
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={featuresOnly}
            onChange={(e) => setFeaturesOnly(e.target.checked)}
          />
          FEATURE のみ
        </label>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {COLS.map((col) => {
          const items = issues.filter(
            (i) =>
              (i.roadmapBucket ?? "none") === col.id &&
              i.status !== "archived" &&
              (!featuresOnly || i.category === "FEATURE"),
          );
          return (
            <div
              key={col.id}
              className="rounded-2xl border border-ink/10 bg-white p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onDrop(col.id)}
              role="list"
              aria-label={col.label}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {col.label} · {items.length}
              </p>
              <ul className="mt-3 space-y-2">
                {items.map((i) => (
                  <li
                    key={i.id}
                    draggable
                    tabIndex={0}
                    onDragStart={() => setDragging(i.id)}
                    onFocus={() => setFocusId(i.id)}
                    onClick={() => setFocusId(i.id)}
                    className={`cursor-grab rounded-xl border bg-paper p-3 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint ${
                      focusId === i.id ? "border-mint" : "border-sand"
                    }`}
                  >
                    <Link to={`/issues/${i.id}`} className="text-sm font-semibold hover:underline">
                      {i.title}
                    </Link>
                    <p className="mt-1 text-xs text-ink/50">
                      {i.category} · Effort {i.effort ?? "—"} · ★{i.votes ?? 0}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
