import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listChangelogRemote, updateChangelogRemote } from "../lib/cloudStore";
import type { ChangelogEntry } from "../lib/types";
import { t } from "../lib/i18n";

export default function ChangelogPage() {
  const [items, setItems] = useState<ChangelogEntry[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    summary: "",
    visibility: "public" as "public" | "internal",
  });
  const [saving, setSaving] = useState(false);

  const reload = async () => setItems(await listChangelogRemote());

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_changelog")}</p>
          <h1 className="font-display mt-1 text-3xl font-bold">{t("page_changelog")}</h1>
          <p className="mt-2 text-sm text-ink/60">
            Done で自動追記（冪等）。公開 / 社内の可視性を切り替えられます。
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <a href="/public/changelog" className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold">
            公開ページ
          </a>
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={() => window.print()}
          >
            印刷
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-sm text-ink/60">
          まだエントリがありません。Board や修正パックで Issue を Done にしてください。
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-ink/10 pl-6">
          {items.map((c) => (
            <li key={c.id} className="relative">
              <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-mint" />
              <p className="text-xs text-ink/45">
                {c.releasedAt ? new Date(c.releasedAt).toLocaleString("ja-JP") : ""} ·{" "}
                {(c.visibility ?? "public") === "public" ? "公開" : "社内のみ"}
              </p>
              {editing === c.id ? (
                <div className="mt-2 space-y-2 print:hidden">
                  <input
                    className="w-full rounded-lg border border-ink/10 px-2 py-1.5 text-sm font-semibold"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                  <textarea
                    className="w-full rounded-lg border border-ink/10 px-2 py-1.5 text-sm"
                    rows={2}
                    value={draft.summary}
                    onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                  />
                  <select
                    className="rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
                    value={draft.visibility}
                    onChange={(e) =>
                      setDraft({ ...draft, visibility: e.target.value as "public" | "internal" })
                    }
                  >
                    <option value="public">公開</option>
                    <option value="internal">社内のみ</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      className="rounded-lg bg-mint px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await updateChangelogRemote(c.id, draft);
                          setEditing(null);
                          await reload();
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs"
                      onClick={() => setEditing(null)}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="mt-1 font-display text-lg font-semibold">{c.title}</h2>
                  <p className="mt-1 text-sm text-ink/65">{c.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs print:hidden">
                    {c.issueId && (
                      <Link to={`/issues/${c.issueId}`} className="text-mint hover:underline">
                        Issue を開く →
                      </Link>
                    )}
                    <button
                      type="button"
                      className="text-ink/50 hover:underline"
                      onClick={() => {
                        setEditing(c.id);
                        setDraft({
                          title: c.title,
                          summary: c.summary,
                          visibility: c.visibility ?? "public",
                        });
                      }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="text-ink/50 hover:underline"
                      onClick={async () => {
                        const next =
                          (c.visibility ?? "public") === "public" ? "internal" : "public";
                        await updateChangelogRemote(c.id, { visibility: next });
                        await reload();
                      }}
                    >
                      {(c.visibility ?? "public") === "public" ? "社内のみに" : "公開する"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
