import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getIssueRemote,
  listMyFeedbackRemote,
  setVerificationRemote,
} from "../lib/cloudStore";
import { formatInTz } from "../lib/demoStore";
import type { Feedback, Issue } from "../lib/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "受付待ち",
  accepted: "対応中",
  merged: "既存Issueに統合",
  snoozed: "保留中",
  rejected: "却下",
};

export default function MyFeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [issueMap, setIssueMap] = useState<Record<string, Issue>>({});
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"new" | "old">("new");

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
    list.sort((a, b) =>
      sort === "new" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    );
    return list;
  }, [items, status, sort]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Closed Loop</p>
        <h1 className="font-display mt-1 text-3xl font-bold">My Feedback</h1>
        <p className="mt-2 text-sm text-ink/60">
          自分の報告と対応状況。Issue が Done になったら解決確認できます。
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
        <ul className="space-y-3">
          {filtered.map((fb) => {
            const issue = fb.issueId ? issueMap[fb.issueId] : undefined;
            const canVerify =
              Boolean(fb.issueId) &&
              (fb.triageStatus === "accepted" || fb.triageStatus === "merged") &&
              issue?.status === "done";
            return (
              <li key={fb.id} className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{fb.rawText}</p>
                  <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">
                    {STATUS_LABEL[fb.triageStatus] ?? fb.triageStatus}
                  </span>
                </div>
                {(fb.screenshotDataUrl || fb.audioDataUrl) && (
                  <div className="mt-2 flex flex-wrap items-start gap-3">
                    {fb.screenshotDataUrl && (
                      <img
                        src={fb.screenshotDataUrl}
                        alt=""
                        className="h-16 w-auto max-w-[40%] rounded-lg border border-ink/10 object-cover"
                      />
                    )}
                    {fb.audioDataUrl && (
                      <audio controls src={fb.audioDataUrl} className="h-8 max-w-full flex-1" />
                    )}
                  </div>
                )}
                {fb.source && (
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-ink/35">{fb.source}</p>
                )}
                <p className="mt-2 text-xs text-ink/45">
                  {formatInTz(fb.createdAt)}
                  {fb.analysis?.title ? ` · ${fb.analysis.title}` : ""}
                  {issue ? ` · Issue: ${issue.status}` : ""}
                </p>
                {fb.triageStatus === "rejected" && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    却下理由: {fb.rejectReason || "（理由なし）"}
                  </p>
                )}
                {fb.triageStatus === "snoozed" && fb.snoozeUntil && (
                  <p className="mt-2 text-xs text-ink/50">
                    保留中（{formatInTz(fb.snoozeUntil)} まで）
                  </p>
                )}
                {fb.issueId && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <Link to={`/issues/${fb.issueId}`} className="text-mint hover:underline">
                      紐づく Issue を見る →
                    </Link>
                    {issue?.status === "done" && (
                      <Link to="/changelog" className="text-mint hover:underline">
                        Changelog →
                      </Link>
                    )}
                  </div>
                )}
                {canVerify && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/5 pt-3">
                    <p className="w-full text-xs text-ink/50">対応完了しました。解決しましたか？</p>
                    {fb.verification && (
                      <p className="w-full text-xs font-medium text-ink/60">
                        回答済み: {fb.verification === "solved" ? "解決した" : "まだ解決していない"}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={fb.verification === "solved"}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint ${
                        fb.verification === "solved"
                          ? "bg-mint/20 text-mint"
                          : "border border-ink/15 hover:bg-sand"
                      }`}
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
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint ${
                        fb.verification === "unsolved"
                          ? "bg-amber-100 text-amber-900"
                          : "border border-ink/15 hover:bg-sand"
                      }`}
                      onClick={async () => {
                        await setVerificationRemote(fb.id, "unsolved");
                        await reload();
                      }}
                    >
                      まだ解決していない
                    </button>
                  </div>
                )}
                {(fb.triageStatus === "accepted" || fb.triageStatus === "merged") &&
                  issue &&
                  issue.status !== "done" && (
                    <p className="mt-3 text-xs text-ink/45">
                      Issue が Done になると、ここで解決確認ができます（現在: {issue.status}）
                    </p>
                  )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
