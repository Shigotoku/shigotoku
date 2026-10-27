import {
  acceptAsIssueRemote,
  listIssuesRemote,
  listOrgFeedbackRemote,
  listPendingFeedbackRemote,
  mergeIntoIssueRemote,
  snoozeFeedbackRemote,
  getFeedbackRemote,
  pushNotificationRemote,
} from "./cloudStore";
import { findDuplicateCandidates } from "./duplicates";
import { findOpenIssueByPageKey } from "./issueLookup";
import { encodePackId } from "./pageKey";
import { loadSettings } from "./demoStore";
import { pushDemoNotification } from "./notifications";
import { canTriage } from "./roles";
import type { Feedback } from "./types";

/** 類似度がこの値以上なら確認なしで既存 Issue にマージ */
export const AUTO_MERGE_SIMILARITY = 0.75;
/** 類似度がこの値以上ならマージ候補として通知 */
export const REVIEW_MERGE_SIMILARITY = 0.5;
export const AUTO_SNOOZE_HOURS = 48;
const SHORT_TEXT_CHARS = 30;
const LOW_PRIORITY_SCORE = 40;
const HIGH_PRIORITY_SCORE = 60;

const SLA_NOTIFIED_KEY = "shapeit:sla-notified:v1";

function readSlaNotified(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SLA_NOTIFIED_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markSlaNotified(id: string) {
  const set = readSlaNotified();
  set.add(id);
  sessionStorage.setItem(SLA_NOTIFIED_KEY, JSON.stringify([...set].slice(-200)));
}

export function isAutoTriageEligible(fb: Feedback): boolean {
  const cat = fb.analysis?.category ?? "OTHER";
  const sev = fb.analysis?.severity ?? "S3";
  if (sev === "S0" || cat === "SECURITY") return false;
  return fb.triageStatus === "pending";
}

function shouldAutoSnooze(fb: Feedback, minConfidence: number): boolean {
  const score = fb.analysis?.priorityScore ?? 30;
  const conf = fb.analysis?.confidence ?? 0;
  const text = fb.rawText.trim();
  if (text.length < SHORT_TEXT_CHARS && (fb.analysis?.severity ?? "S3") === "S3") return true;
  if (score < LOW_PRIORITY_SCORE && conf < minConfidence) return true;
  if ((fb.analysis?.category ?? "OTHER") === "OTHER" && conf < minConfidence) return true;
  return false;
}

function shouldAcceptToBoard(fb: Feedback): boolean {
  const cat = fb.analysis?.category ?? "OTHER";
  const sev = fb.analysis?.severity ?? "S3";
  const score = fb.analysis?.priorityScore ?? 0;
  if (cat === "FEATURE" || cat === "IDEA") return false;
  if (cat === "BUG" && (sev === "S1" || score >= HIGH_PRIORITY_SCORE)) return true;
  if (["UX", "UI", "PERFORMANCE", "COPY", "BUG"].includes(cat) && score >= 50) return true;
  return false;
}

async function notifyAutoTriage(title: string, body: string, href?: string) {
  const settings = loadSettings();
  if (!settings.notifyAutoTriage) return;
  try {
    await pushNotificationRemote({ title, body, href, kind: "general" });
  } catch {
    pushDemoNotification({ uid: "demo", title, body, href, kind: "general", read: false });
  }
}

async function markAutoTriaged(feedbackId: string) {
  const { markFeedbackAutoTriagedRemote } = await import("./cloudStore");
  await markFeedbackAutoTriagedRemote(feedbackId);
}

export type AutoTriageOutcome =
  | { action: "none" }
  | { action: "merged"; issueId: string; reason: string }
  | { action: "accepted"; issueId: string; reason: string }
  | { action: "snoozed"; reason: string }
  | { action: "review"; reason: string; issueId?: string };

export async function runAutoTriageForFeedback(feedbackId: string): Promise<AutoTriageOutcome> {
  const settings = loadSettings();
  if (!settings.autoTriageEnabled) return { action: "none" };
  if (!canTriage()) return { action: "none" };

  const fb = await getFeedbackRemote(feedbackId);
  if (!fb || !isAutoTriageEligible(fb) || fb.autoTriaged) return { action: "none" };

  const minConf = settings.autoTriageMinConfidence;
  const confidence = fb.analysis?.confidence ?? 0.55;
  const [issues, allFeedback] = await Promise.all([listIssuesRemote(), listOrgFeedbackRemote()]);
  const fbMap = new Map(allFeedback.map((f) => [f.id, f]));

  if (fb.pageUrl) {
    const byUrl = findOpenIssueByPageKey(issues, fbMap, fb.pageUrl);
    if (byUrl) {
      await mergeIntoIssueRemote(feedbackId, byUrl.id);
      await markAutoTriaged(feedbackId);
      await notifyAutoTriage(
        "自動マージ（同一URL）",
        `「${fb.analysis?.title || fb.rawText.slice(0, 40)}」→ ${byUrl.title}`,
        `/issues/${byUrl.id}`,
      );
      return { action: "merged", issueId: byUrl.id, reason: "same_url" };
    }
  }

  const dups = findDuplicateCandidates(fb.rawText, issues, allFeedback.filter((f) => f.id !== fb.id));
  const topIssue = dups.find((d) => d.kind === "issue");
  if (topIssue && topIssue.score >= AUTO_MERGE_SIMILARITY) {
    await mergeIntoIssueRemote(feedbackId, topIssue.id);
    await markAutoTriaged(feedbackId);
    await notifyAutoTriage(
      "自動マージ（類似）",
      `類似度 ${Math.round(topIssue.score * 100)}% → ${topIssue.title}`,
      `/issues/${topIssue.id}`,
    );
    return { action: "merged", issueId: topIssue.id, reason: "similarity" };
  }
  if (topIssue && topIssue.score >= REVIEW_MERGE_SIMILARITY) {
    await notifyAutoTriage(
      "マージ候補を検出",
      `類似度 ${Math.round(topIssue.score * 100)}% · ${topIssue.title} への統合を確認してください`,
      "/inbox",
    );
    return { action: "review", reason: "similarity_candidate", issueId: topIssue.id };
  }

  if (shouldAutoSnooze(fb, minConf)) {
    await snoozeFeedbackRemote(feedbackId, AUTO_SNOOZE_HOURS);
    await markAutoTriaged(feedbackId);
    return { action: "snoozed", reason: "low_signal" };
  }

  if (confidence < minConf) return { action: "none" };

  const cat = fb.analysis?.category ?? "OTHER";
  if (cat === "FEATURE" || cat === "IDEA") {
    const issue = await acceptAsIssueRemote(feedbackId, { forceCategory: "FEATURE" });
    await markAutoTriaged(feedbackId);
    await notifyAutoTriage("自動振り分け（アイデア）", issue.title, "/ideas");
    return { action: "accepted", issueId: issue.id, reason: "feature" };
  }

  if (shouldAcceptToBoard(fb)) {
    const issue = await acceptAsIssueRemote(feedbackId);
    await markAutoTriaged(feedbackId);
    await notifyAutoTriage("自動振り分け（ボード）", issue.title, `/issues/${issue.id}`);
    return { action: "accepted", issueId: issue.id, reason: "board" };
  }

  return { action: "none" };
}

export async function runBatchAutoTriageForPending(): Promise<number> {
  if (!loadSettings().autoTriageEnabled || !canTriage()) return 0;
  const pending = await listPendingFeedbackRemote();
  let acted = 0;
  for (const fb of pending) {
    if (fb.autoTriaged) continue;
    const result = await runAutoTriageForFeedback(fb.id);
    if (result.action !== "none" && result.action !== "review") acted += 1;
  }
  return acted;
}

export async function checkSlaBreachesAndNotify(pending: Feedback[]): Promise<number> {
  const settings = loadSettings();
  if (!settings.notifySla) return 0;
  const slaMs = settings.triageSlaHours * 3600_000;
  const notified = readSlaNotified();
  let count = 0;
  const now = Date.now();

  for (const fb of pending) {
    if (fb.triageStatus !== "pending") continue;
    if (now - new Date(fb.createdAt).getTime() < slaMs) continue;
    if (notified.has(fb.id)) continue;
    const title = "SLA超過の投稿";
    const body = `「${(fb.analysis?.title || fb.rawText).slice(0, 60)}」が ${settings.triageSlaHours}h を超えています`;
    try {
      await pushNotificationRemote({ title, body, href: "/inbox", kind: "general" });
    } catch {
      pushDemoNotification({ uid: "demo", title, body, href: "/inbox", kind: "general", read: false });
    }
    markSlaNotified(fb.id);
    count += 1;
  }
  return count;
}

export function fixPackDigestHref(pageKey: string, appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/fix-packs/${encodePackId(pageKey)}`;
}
