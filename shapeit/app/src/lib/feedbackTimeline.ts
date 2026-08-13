import type { Feedback, Issue } from "./types";

export type FeedbackTimelineStep = {
  key: string;
  label: string;
  done: boolean;
  current?: boolean;
  hint?: string;
};

const ISSUE_STATUS_LABEL: Record<string, string> = {
  todo: "Todo",
  in_progress: "対応中",
  review: "レビュー",
  verify: "確認",
  done: "完了",
  archived: "アーカイブ",
};

export function buildFeedbackTimeline(fb: Feedback, issue?: Issue): FeedbackTimelineStep[] {
  const steps: FeedbackTimelineStep[] = [{ key: "submitted", label: "投稿", done: true }];

  if (fb.triageStatus === "rejected") {
    steps.push({ key: "rejected", label: "却下", done: true, current: true, hint: fb.rejectReason });
    return steps;
  }

  if (fb.triageStatus === "snoozed") {
    steps.push({
      key: "snoozed",
      label: "保留",
      done: true,
      current: true,
      hint: fb.snoozeUntil ? `〜 ${fb.snoozeUntil.slice(0, 16).replace("T", " ")}` : undefined,
    });
    return steps;
  }

  if (fb.triageStatus === "pending") {
    steps.push({ key: "triage", label: "受付・整理", done: false, current: true });
    return steps;
  }

  steps.push({ key: "accepted", label: "受理", done: true });

  if (!issue) {
    steps.push({ key: "issue", label: "Issue 紐付け", done: false, current: true });
    return steps;
  }

  const status = issue.status;
  const statusOrder = ["todo", "in_progress", "review", "verify", "done"] as const;
  const idx = statusOrder.indexOf(status as typeof statusOrder[number]);

  for (let i = 0; i < statusOrder.length; i++) {
    const s = statusOrder[i];
    const done = idx >= i || status === "done";
    const current = status === s;
    steps.push({
      key: s,
      label: ISSUE_STATUS_LABEL[s] ?? s,
      done,
      current,
    });
  }

  if (status === "done") {
    if (fb.verification === "solved") {
      steps.push({ key: "verified", label: "解決確認済み", done: true, current: true });
    } else if (fb.verification === "unsolved") {
      steps.push({ key: "reopened", label: "未解決として報告", done: true, current: true });
    } else {
      steps.push({ key: "verify_user", label: "あなたの確認待ち", done: false, current: true });
    }
  }

  return steps;
}
