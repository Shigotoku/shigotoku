import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchRemote } from "../lib/cloudStore";
import type { ChangelogEntry, Feedback, Issue } from "../lib/types";

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [nav, setNav] = useState<{ to: string; label: string }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const r = searchRemote(q) as ReturnType<typeof searchRemote> & {
      changelog?: ChangelogEntry[];
      nav?: { to: string; label: string }[];
    };
    setIssues(r.issues);
    setFeedback(r.feedback);
    setChangelog(r.changelog ?? []);
    setNav(r.nav ?? []);
  }, [q, open]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/50 p-4 pt-[12vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="コマンドパレット"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Issue / Feedback / Changelog / ナビを検索…"
          className="w-full border-b border-ink/10 px-4 py-3 text-sm outline-none"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />
        <ul className="max-h-80 overflow-y-auto p-2 text-sm">
          {nav.map((n) => (
            <li key={n.to}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-sand"
                onClick={() => {
                  navigate(n.to);
                  onClose();
                }}
              >
                <span className="text-[10px] font-semibold uppercase text-ink/40">Go</span>
                <p className="font-medium">{n.label}</p>
              </button>
            </li>
          ))}
          {issues.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-sand"
                onClick={() => {
                  navigate(`/issues/${i.id}`);
                  onClose();
                }}
              >
                <span className="text-[10px] font-semibold uppercase text-ink/40">Issue</span>
                <p className="font-medium">{i.title}</p>
              </button>
            </li>
          ))}
          {feedback.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-sand"
                onClick={() => {
                  navigate(f.issueId ? `/issues/${f.issueId}` : "/my-feedback");
                  onClose();
                }}
              >
                <span className="text-[10px] font-semibold uppercase text-ink/40">Feedback</span>
                <p className="font-medium">{f.analysis?.title ?? f.rawText.slice(0, 60)}</p>
              </button>
            </li>
          ))}
          {changelog.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-sand"
                onClick={() => {
                  navigate("/changelog");
                  onClose();
                }}
              >
                <span className="text-[10px] font-semibold uppercase text-ink/40">Changelog</span>
                <p className="font-medium">{c.title}</p>
              </button>
            </li>
          ))}
          {q && issues.length === 0 && feedback.length === 0 && changelog.length === 0 && nav.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-ink/45">ヒットなし</li>
          )}
          {!q && (
            <li className="px-3 py-4 text-xs text-ink/45">
              Ctrl/Cmd+K · <kbd>c</kbd> Capture · <kbd>i</kbd> Inbox · <kbd>b</kbd> Board · <kbd>?</kbd> ヘルプ
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
