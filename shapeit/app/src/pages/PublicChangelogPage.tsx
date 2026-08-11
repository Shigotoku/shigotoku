import { useEffect, useState } from "react";
import { listPublicChangelog } from "../lib/demoStore";
import type { ChangelogEntry } from "../lib/types";

/** CL-002: 公開 Changelog（ログイン不要） */
export default function PublicChangelogPage() {
  const [items, setItems] = useState<ChangelogEntry[]>([]);
  useEffect(() => {
    setItems(listPublicChangelog());
  }, []);

  return (
    <div className="min-h-screen bg-paper px-4 py-10">
      <div className="w-full">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">ShapeIt</p>
        <h1 className="font-display mt-2 text-4xl font-bold">Changelog</h1>
        <p className="mt-2 text-sm text-ink/60">直近の改善一覧（公開・印刷可）</p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold print:hidden"
          onClick={() => window.print()}
        >
          印刷
        </button>
        {items.length === 0 ? (
          <p className="mt-8 text-sm text-ink/50">まだ公開エントリがありません。</p>
        ) : (
          <ol className="mt-8 space-y-6 border-l border-ink/10 pl-6">
            {items.map((c) => (
              <li key={c.id} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-mint" />
                <p className="text-xs text-ink/45">
                  {c.releasedAt ? new Date(c.releasedAt).toLocaleDateString("ja-JP") : ""}
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">{c.title}</h2>
                <p className="mt-1 text-sm text-ink/65">{c.summary}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
