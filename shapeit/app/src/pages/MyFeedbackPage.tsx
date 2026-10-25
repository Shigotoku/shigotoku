import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteFeedbackRemote,
  getIssueRemote,
  listMyFeedbackRemote,
  setVerificationRemote,
} from "../lib/cloudStore";
import { formatInTz } from "../lib/demoStore";
import { extractFeedbackTitle } from "../lib/feedbackTitle";
import {
  feedbackDeviceLabel,
  matchesDeviceFilter,
  type FeedbackDeviceFilter,
} from "../lib/feedbackSource";
import type { Feedback, Issue } from "../lib/types";
import { t } from "../lib/i18n";

const STATUS_LABEL: Record<string, string> = {
  pending: "受付待ち",
  accepted: "対応中",
  merged: "統合済み",
  snoozed: "保留",
  rejected: "却下",
};

export default function MyFeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [issueMap, setIssueMap] = useState<Record<string, Issue>>({});
  const [status, setStatus] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState<FeedbackDeviceFilter>("all");
  const [sort, setSort] = useState<"new" | "old">("new");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reload = async () => {
    const list = await listMyFeedbackRemote();
    setItems(list);
    const map: Record<string, Issue> = {};
    for (const fb of list) {
      if (!fb.issueId || map[fb.issueId]) continue;
      const iss = await getIssueRemote(fb.issueId);
      if (iss) map[fb.issueId] = iss;
    }
    setIssueMap(map);
  };

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    let list = [...items];
    if (status !== "all") list = list.filter((f) => f.triageStatus === status);
    list = list.filter((f) => matchesDeviceFilter(f.source, deviceFilter));
    list.sort((a, b) =>
      sort === "new" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    );
    return list;
  }, [items, status, deviceFilter, sort]);

  const handleDelete = async (fb: Feedback) => {
    if (!window.confirm("この投稿を削除しますか？元に戻せません。")) return;
    try {
      await deleteFeedbackRemote(fb.id);
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "削除できませんでした");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_my")}</p>
        <h1 className="font-display mt-1 text-3xl font-bold">{t("page_my")}</h1>
        <p className="mt-2 text-sm text-ink/60">
          自分の報告と対応状況。間違えた投稿はカードから削除できます。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="ステータスで絞り込み"
        >
          <option value="all">すべて</option>
          {["pending", "accepted", "merged", "snoozed", "rejected"].map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs"
          value={deviceFilter}
          onChange={(e) => setDeviceFilter(e.target.value as FeedbackDeviceFilter)}
          aria-label="端末で絞り込み"
        >
          <option value="all">すべての端末</option>
          <option value="pc">PC</option>
          <option value="mobile">携帯</option>
        </select>
        <select
          className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-xs"
          value={sort}
          onChange={(e) => setSort(e.target.value as "new" | "old")}
          aria-label="並び順"
        >
          <option value="new">新しい順</option>
          <option value="old">古い順</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-sm text-ink/60">
          まだ投稿がありません。
          <Link to="/capture" className="ml-1 font-medium text-mint hover:underline">
            気づきを投稿
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((fb) => {
            const issue = fb.issueId ? issueMap[fb.issueId] : undefined;
            const expanded = expandedId === fb.id;
            const title = extractFeedbackTitle(fb.rawText, fb.analysis?.title);
            const canVerify =
              Boolean(fb.issueId) &&
              (fb.triageStatus === "accepted" || fb.triageStatus === "merged") &&
              issue?.status === "done";

            return (
              <li
                key={fb.id}
                className="flex flex-col rounded-lg border border-ink/10 bg-white p-3 shadow-sm"
              >
                {fb.screenshotDataUrl ? (
                  <img
                    src={fb.screenshotDataUrl}
                    alt=""
                    className="mb-2 h-24 w-full rounded border border-ink/10 object-cover object-top"
                  />
                ) : (
                  <div className="mb-2 flex h-24 items-center justify-center rounded border border-dashed border-ink/15 bg-paper text-[10px] text-ink/40">
                    テキストのみ
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{title}</p>
                  <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold">
                    {STATUS_LABEL[fb.triageStatus] ?? fb.triageStatus}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-ink/60">{fb.rawText}</p>
                <p className="mt-2 text-[10px] text-ink/45">
                  {formatInTz(fb.createdAt)} · {feedbackDeviceLabel(fb.source)}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <button
                    type="button"
                    className="rounded-md border border-ink/15 px-2 py-1 text-[11px] font-semibold"
                    onClick={() => setExpandedId(expanded ? null : fb.id)}
                  >
                    {expanded ? "閉じる" : "詳細"}
                  </button>
                  {fb.issueId && (
                    <Link
                      to={`/issues/${fb.issueId}`}
                      className="rounded-md border border-mint/30 px-2 py-1 text-[11px] font-semibold text-mint"
                    >
                      Issue
                    </Link>
                  )}
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700"
                    onClick={() => void handleDelete(fb)}
                  >
                    削除
                  </button>
                </div>
                {expanded && (
                  <div className="mt-3 border-t border-ink/8 pt-3 text-xs text-ink/70">
                    {fb.audioDataUrl && (
                      <audio controls src={fb.audioDataUrl} className="mb-2 h-8 w-full" />
                    )}
                    {fb.triageStatus === "rejected" && (
                      <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-amber-900">
                        却下: {fb.rejectReason || "（理由なし）"}
                      </p>
                    )}
                    {canVerify && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={fb.verification === "solved"}
                          className="rounded-md border border-ink/15 px-2 py-1 font-semibold disabled:opacity-50"
                          onClick={async () => {
                            await setVerificationRemote(fb.id, "solved");
                            await reload();
                          }}
                        >
                          解決した
                        </button>
                        <button
                          type="button"
                          disabled={fb.verification === "unsolved"}
                          className="rounded-md border border-ink/15 px-2 py-1 font-semibold disabled:opacity-50"
                          onClick={async () => {
                            await setVerificationRemote(fb.id, "unsolved");
                            await reload();
                          }}
                        >
                          未解決
                        </button>
                      </div>
                    )}
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
