import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listIssuesRemote, updateIssueRemote } from "../lib/cloudStore";
import type { Effort, Issue, RoadmapBucket } from "../lib/types";

type SortKey = "votes" | "fit" | "arr" | "priority";

/** IDEA-001/002: FEATURE 系を Ideas として分離 */
export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Issue[]>([]);
  const [sort, setSort] = useState<SortKey>("votes");

  const reload = async () => {
    const all = await listIssuesRemote();
    setIdeas(all.filter((i) => i.category === "FEATURE" && i.status !== "archived"));
  };

  useEffect(() => {
    void reload();
  }, []);

  const sorted = useMemo(() => {
    const list = [...ideas];
    list.sort((a, b) => {
      if (sort === "votes") return (b.votes ?? 0) - (a.votes ?? 0);
      if (sort === "fit") return (b.strategicFit ?? 0) - (a.strategicFit ?? 0);
      if (sort === "arr") return (b.arrImpact ?? 0) - (a.arrImpact ?? 0);
      return (b.priorityOverride ?? b.priorityScore) - (a.priorityOverride ?? a.priorityScore);
    });
    return list;
  }, [ideas, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Ideas</p>
          <h1 className="font-display mt-1 text-3xl font-bold">Idea Board</h1>
          <p className="mt-2 text-sm text-ink/60">Vote / Customers / ARR / Fit / Effort</p>
        </div>
        <select
          className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="votes">Votes</option>
          <option value="fit">Strategic Fit</option>
          <option value="arr">ARR Impact</option>
          <option value="priority">Priority</option>
        </select>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-sm text-ink/60">
          Idea がありません。「機能を追加してほしい」系の投稿から作成されます。
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((idea) => (
            <li key={idea.id} className="rounded-2xl border border-ink/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/issues/${idea.id}`} className="font-display text-lg font-semibold hover:underline">
                    {idea.title}
                  </Link>
                  <p className="mt-1 text-sm text-ink/60">{idea.summary}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold tabular-nums">★ {idea.votes ?? 0}</p>
                  <p className="text-ink/45">ARR {idea.arrImpact ?? 0}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold"
                  onClick={async () => {
                    await updateIssueRemote(idea.id, { votes: (idea.votes ?? 0) + 1 });
                    await reload();
                  }}
                >
                  +1 Vote
                </button>
                <label className="text-[10px] text-ink/50">
                  Customers
                  <input
                    type="number"
                    min={0}
                    className="ml-1 w-16 rounded border border-ink/10 px-1 py-1 text-xs"
                    value={idea.customerCount ?? 0}
                    onChange={async (e) => {
                      await updateIssueRemote(idea.id, { customerCount: Number(e.target.value) });
                      await reload();
                    }}
                  />
                </label>
                <label className="text-[10px] text-ink/50">
                  ARR
                  <input
                    type="number"
                    min={0}
                    className="ml-1 w-20 rounded border border-ink/10 px-1 py-1 text-xs"
                    value={idea.arrImpact ?? 0}
                    onChange={async (e) => {
                      await updateIssueRemote(idea.id, { arrImpact: Number(e.target.value) });
                      await reload();
                    }}
                  />
                </label>
                <label className="text-[10px] text-ink/50">
                  Fit
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="ml-1 w-16 rounded border border-ink/10 px-1 py-1 text-xs"
                    value={idea.strategicFit ?? 50}
                    onChange={async (e) => {
                      await updateIssueRemote(idea.id, { strategicFit: Number(e.target.value) });
                      await reload();
                    }}
                  />
                </label>
                <select
                  className="rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
                  value={idea.effort ?? "M"}
                  onChange={async (e) => {
                    await updateIssueRemote(idea.id, { effort: e.target.value as Effort });
                    await reload();
                  }}
                >
                  {(["S", "M", "L", "XL"] as Effort[]).map((e) => (
                    <option key={e} value={e}>
                      Effort {e}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-ink/10 px-2 py-1.5 text-xs"
                  value={idea.roadmapBucket ?? "later"}
                  onChange={async (e) => {
                    await updateIssueRemote(idea.id, { roadmapBucket: e.target.value as RoadmapBucket });
                    await reload();
                  }}
                >
                  {(["now", "next", "later", "none"] as RoadmapBucket[]).map((b) => (
                    <option key={b} value={b}>
                      Roadmap: {b}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
