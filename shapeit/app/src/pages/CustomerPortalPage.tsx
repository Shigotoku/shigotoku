import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { listMyFeedback, listIssues, loadSettings, formatInTz, listChangelog } from "../lib/demoStore";

const TRIAGE_LABEL: Record<string, string> = {
  pending: "受付済み・確認中",
  accepted: "対応予定",
  merged: "既存の改善に統合",
  snoozed: "保留中",
  rejected: "今回は見送り",
};

const ISSUE_LABEL: Record<string, string> = {
  todo: "予定",
  in_progress: "対応中",
  review: "レビュー中",
  verify: "確認待ち",
  done: "完了",
  archived: "アーカイブ",
};

/** CL-003: 薄い Customer Portal（マジックリンク相当のトークン） */
export default function CustomerPortalPage() {
  const { token = "" } = useParams();
  const expected = loadSettings().portalToken;
  const ok = Boolean(expected) && token === expected;

  const items = useMemo(() => {
    if (!ok) return [];
    return listMyFeedback().slice(0, 30);
  }, [ok]);

  const issues = useMemo(() => listIssues(), []);
  const changelog = useMemo(() => listChangelog().slice(0, 5), []);

  if (!ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="max-w-md rounded-2xl border border-ink/10 bg-white p-8 text-center">
          <p className="font-display text-2xl font-bold">ShapeIt Portal</p>
          <p className="mt-3 text-sm text-ink/60">リンクが無効または期限切れです。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-10">
      <div className="w-full">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">ShapeIt</p>
        <h1 className="font-display mt-2 text-3xl font-bold">あなたの声の進捗</h1>
        <p className="mt-2 text-sm text-ink/60">ログイン不要の進捗確認（デモ）</p>
        <p className="mt-2 text-xs">
          <a href="/public/changelog" className="text-mint hover:underline">
            公開 Changelog を見る →
          </a>
        </p>
        <ul className="mt-8 space-y-3">
          {items.map((fb) => {
            const issue = fb.issueId ? issues.find((i) => i.id === fb.issueId) : undefined;
            return (
              <li key={fb.id} className="rounded-2xl border border-ink/10 bg-white p-4">
                <p className="text-sm font-medium">{fb.rawText}</p>
                <p className="mt-2 text-xs text-ink/45">{formatInTz(fb.createdAt)}</p>
                <p className="mt-2 text-xs text-ink/70">
                  {TRIAGE_LABEL[fb.triageStatus] ?? fb.triageStatus}
                  {issue ? ` · ${ISSUE_LABEL[issue.status] ?? issue.status}` : ""}
                </p>
                {fb.triageStatus === "rejected" && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    理由: {fb.rejectReason || "対象外と判断しました"}
                  </p>
                )}
                {issue?.status === "done" && fb.verification !== "solved" && (
                  <p className="mt-2 text-xs text-mint">
                    対応が完了しました。アプリの My Feedback で解決確認できます。
                  </p>
                )}
              </li>
            );
          })}
          {items.length === 0 && (
            <li className="text-sm text-ink/50">まだフィードバックがありません。</li>
          )}
        </ul>
        {changelog.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold">最近の改善</h2>
            <ul className="mt-3 space-y-2">
              {changelog.map((c) => (
                <li key={c.id} className="rounded-xl bg-white px-4 py-3 text-sm border border-ink/10">
                  <p className="font-medium">{c.title}</p>
                  <p className="mt-1 text-xs text-ink/55">{c.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-8 text-center text-xs text-ink/40">
          <Link to="/login" className="text-mint hover:underline">
            ShapeIt にログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
