import type { AppNotification, Feedback, Issue } from "./types";
import { computeDigest, loadSettings } from "./demoStore";

export interface DigestData {
  weekLabel: string;
  newFeedbackCount: number;
  pendingTriage: number;
  criticalCount: number;
  slaBreaches: number;
  reopened: number;
  autoTriageRate: number;
  surging: Issue[];
  critical: Issue[];
  reopenedItems: Feedback[];
}

export function computeDigestFromData(
  feedback: Feedback[],
  issues: Issue[],
  _notifications: AppNotification[],
): DigestData {
  const weekAgo = Date.now() - 7 * 86400_000;
  const inWeek = (iso: string) => new Date(iso).getTime() >= weekAgo;
  const newFeedback = feedback.filter((f) => inWeek(f.createdAt));
  const critical = issues.filter((i) => i.severity === "S0" || i.severity === "S1");
  const pending = feedback.filter((f) => f.triageStatus === "pending").length;
  const auto = feedback.filter((f) => f.autoTriaged).length;
  const slaHours = loadSettings().triageSlaHours;
  const slaBreaches = feedback.filter(
    (f) =>
      f.triageStatus === "pending" &&
      Date.now() - new Date(f.createdAt).getTime() > slaHours * 3600_000,
  ).length;
  const reopenedItems = feedback.filter(
    (f) => f.verification === "unsolved" && inWeek(f.updatedAt ?? f.createdAt),
  );
  return {
    weekLabel: new Date().toLocaleDateString("ja-JP"),
    newFeedbackCount: newFeedback.length,
    pendingTriage: pending,
    criticalCount: critical.length,
    slaBreaches,
    reopened: reopenedItems.length,
    autoTriageRate: feedback.length ? auto / feedback.length : 0,
    surging: [...issues].sort((a, b) => b.feedbackIds.length - a.feedbackIds.length).slice(0, 5),
    critical,
    reopenedItems,
  };
}

export function generateWeeklyReviewTextFromDigest(d: DigestData) {
  return [
    `# Weekly Product Review (${d.weekLabel})`,
    `- 新規 Feedback: ${d.newFeedbackCount}`,
    `- 未 Triage: ${d.pendingTriage}`,
    `- Critical: ${d.criticalCount}`,
    `- SLA超過: ${d.slaBreaches}`,
    `- 再燃アラート: ${d.reopened}`,
    "",
    "## Critical",
    ...d.critical.map((i) => `- [${i.severity}] ${i.title}`),
  ].join("\n");
}

export { computeDigest };
