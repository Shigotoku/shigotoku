import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db, getIdToken } from "./firebase";
import { API_URL } from "./urls";
import { getCurrentOrgId } from "./org";
import { isLoggedIn as isDemo, listChangelog, listIssues, listMyFeedback, listPendingFeedback } from "./demoStore";
import { localTriage } from "./triage";
import { loadSettings } from "./demoStore";
import { pushAudit } from "./audit";
import {
  listDemoNotifications,
  markAllDemoNotificationsRead,
  markDemoNotificationRead,
} from "./notifications";
import type {
  AppNotification,
  ChangelogEntry,
  Feedback,
  FeedbackSource,
  Issue,
  IssueComment,
  IssueStatus,
} from "./types";
import type { FixPackMeta } from "./packMeta";

let cache = {
  issues: [] as Issue[],
  feedback: [] as Feedback[],
  changelog: [] as ChangelogEntry[],
};

function isoOf(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value === "string" && value) return value;
  const ts = value as { toDate?: () => Date } | undefined;
  if (ts?.toDate) return ts.toDate().toISOString();
  return fallback;
}

function mapFeedback(id: string, data: Record<string, unknown>): Feedback {
  return {
    id,
    uid: String(data.uid ?? ""),
    organizationId: String(data.organizationId ?? ""),
    rawText: String(data.rawText ?? ""),
    pageUrl: data.pageUrl ? String(data.pageUrl) : undefined,
    pageTitle: data.pageTitle ? String(data.pageTitle) : undefined,
    screenshotDataUrl: data.screenshotDataUrl ? String(data.screenshotDataUrl) : undefined,
    screenshotUrl: data.screenshotUrl ? String(data.screenshotUrl) : undefined,
    audioDataUrl: data.audioDataUrl ? String(data.audioDataUrl) : undefined,
    source: data.source as FeedbackSource | undefined,
    authorName: String(data.authorName ?? ""),
    analysis: data.analysis as Feedback["analysis"],
    triageStatus: (data.triageStatus as Feedback["triageStatus"]) || "pending",
    issueId: (data.issueId as string | null) ?? null,
    snoozeUntil: data.snoozeUntil ? String(data.snoozeUntil) : undefined,
    rejectReason: data.rejectReason ? String(data.rejectReason) : undefined,
    adminSummary: data.adminSummary ? String(data.adminSummary) : undefined,
    detectedLang: data.detectedLang ? String(data.detectedLang) : undefined,
    autoTriaged: Boolean(data.autoTriaged),
    verification: data.verification as Feedback["verification"],
    createdAt: isoOf(data.createdAtIso ?? data.createdAt),
  };
}

function mapIssue(id: string, data: Record<string, unknown>): Issue {
  return {
    id,
    uid: data.uid ? String(data.uid) : undefined,
    organizationId: String(data.organizationId ?? ""),
    title: String(data.title ?? ""),
    summary: String(data.summary ?? ""),
    category: String(data.category ?? "OTHER"),
    severity: String(data.severity ?? "S3"),
    priorityScore: Number(data.priorityScore ?? 0),
    priorityOverride: data.priorityOverride == null ? null : Number(data.priorityOverride),
    priorityOverrideReason: data.priorityOverrideReason ? String(data.priorityOverrideReason) : undefined,
    status: (data.status as IssueStatus) || "todo",
    productArea: String(data.productArea ?? ""),
    assignee: data.assignee ? String(data.assignee) : null,
    feedbackIds: Array.isArray(data.feedbackIds) ? (data.feedbackIds as string[]) : [],
    effort: data.effort as Issue["effort"],
    votes: data.votes != null ? Number(data.votes) : undefined,
    customerCount: data.customerCount != null ? Number(data.customerCount) : undefined,
    strategicFit: data.strategicFit != null ? Number(data.strategicFit) : undefined,
    arrImpact: data.arrImpact != null ? Number(data.arrImpact) : undefined,
    roadmapBucket: data.roadmapBucket as Issue["roadmapBucket"],
    dueAt: data.dueAt ? String(data.dueAt) : undefined,
    dueDate: data.dueDate ? String(data.dueDate) : undefined,
    release: data.release ? String(data.release) : undefined,
    segment: data.segment ? String(data.segment) : undefined,
    initiative: data.initiative ? String(data.initiative) : undefined,
    branchName: data.branchName ? String(data.branchName) : undefined,
    prUrl: data.prUrl ? String(data.prUrl) : undefined,
    relations: Array.isArray(data.relations) ? (data.relations as Issue["relations"]) : [],
    createdAt: isoOf(data.createdAtIso ?? data.createdAt),
    updatedAt: isoOf(data.updatedAtIso ?? data.updatedAt),
  };
}

async function requireOrgId() {
  const orgId = getCurrentOrgId();
  if (!orgId || orgId === "demo") throw new Error("組織に所属していません");
  return orgId;
}

export async function listOrgFeedbackRemote(): Promise<Feedback[]> {
  if (isDemo()) return listMyFeedback();
  const orgId = await requireOrgId();
  const snap = await getDocs(query(collection(db, "shapeit_feedback"), where("organizationId", "==", orgId)));
  const list = snap.docs.map((d) => mapFeedback(d.id, d.data()));
  cache.feedback = list;
  return list;
}

export async function listMyFeedbackRemote(): Promise<Feedback[]> {
  if (isDemo()) return listMyFeedback();
  const orgId = getCurrentOrgId();
  const uid = auth.currentUser?.uid;
  if (!orgId || orgId === "demo" || !uid) return [];
  const snap = await getDocs(
    query(collection(db, "shapeit_feedback"), where("organizationId", "==", orgId), where("uid", "==", uid)),
  );
  return snap.docs.map((d) => mapFeedback(d.id, d.data()));
}

export async function listPendingFeedbackRemote(): Promise<Feedback[]> {
  if (isDemo()) return listPendingFeedback();
  const all = await listOrgFeedbackRemote();
  return all.filter((f) => f.triageStatus === "pending" || (f.triageStatus === "snoozed" && (!f.snoozeUntil || f.snoozeUntil <= new Date().toISOString())));
}

export async function listIssuesRemote(): Promise<Issue[]> {
  if (isDemo()) return listIssues();
  const orgId = await requireOrgId();
  const snap = await getDocs(query(collection(db, "shapeit_issues"), where("organizationId", "==", orgId)));
  const list = snap.docs.map((d) => mapIssue(d.id, d.data()));
  cache.issues = list;
  return list;
}

export async function getFeedbackRemote(id: string): Promise<Feedback | undefined> {
  if (isDemo()) return listMyFeedback().find((f) => f.id === id);
  const snap = await getDoc(doc(db, "shapeit_feedback", id));
  if (!snap.exists()) return undefined;
  return mapFeedback(snap.id, snap.data());
}

export async function getIssueRemote(id: string): Promise<Issue | undefined> {
  if (isDemo()) return listIssues().find((i) => i.id === id);
  const snap = await getDoc(doc(db, "shapeit_issues", id));
  if (!snap.exists()) return undefined;
  return mapIssue(snap.id, snap.data());
}

async function analyze(rawText: string, pageUrl?: string, useAi = false) {
  const local = localTriage(rawText, pageUrl);
  if (!useAi) return local;
  try {
    const token = await getIdToken();
    if (token) {
      const res = await fetch(`${API_URL}/v1/ai/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rawText, pageUrl }),
      });
      if (res.ok) {
        const body = (await res.json()) as { analysis?: ReturnType<typeof localTriage> };
        if (body.analysis) return body.analysis;
      }
    }
  } catch {
    /* local fallback */
  }
  return local;
}

export async function reanalyzeFeedbackRemote(feedbackId: string) {
  const fb = await getFeedbackRemote(feedbackId);
  if (!fb) throw new Error("投稿が見つかりません");
  const analysis = await analyze(fb.rawText, fb.pageUrl, true);
  if (isDemo()) {
    const { updateFeedbackAnalysisDemo } = await import("./demoStore");
    updateFeedbackAnalysisDemo(feedbackId, analysis);
    return analysis;
  }
  await updateDoc(doc(db, "shapeit_feedback", feedbackId), {
    analysis,
    autoTriaged: analysis.triageSource === "gemini",
    updatedAtIso: new Date().toISOString(),
  });
  return analysis;
}

export async function createFeedbackRemote(input: {
  rawText: string;
  pageUrl?: string;
  pageTitle?: string;
  screenshotDataUrl?: string;
  audioDataUrl?: string;
  consoleSnippet?: string;
  idempotencyKey?: string;
  source?: FeedbackSource;
}): Promise<Feedback> {
  if (isDemo()) {
    const { createFeedback } = await import("./demoStore");
    return createFeedback(input);
  }
  const orgId = await requireOrgId();
  const user = auth.currentUser;
  if (!user) throw new Error("未ログインです");
  const analysis = await analyze(input.rawText, input.pageUrl);
  const now = new Date().toISOString();
  const payload = {
    uid: user.uid,
    organizationId: orgId,
    projectId: "default",
    rawText: input.rawText,
    pageUrl: input.pageUrl ?? null,
    pageTitle: input.pageTitle ?? null,
    screenshotDataUrl: input.screenshotDataUrl ?? null,
    audioDataUrl: input.audioDataUrl ?? null,
    consoleSnippet: input.consoleSnippet ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    source: input.source ?? "APP_WIDGET",
    authorName: user.displayName || user.email || user.uid,
    analysis,
    triageStatus: "pending",
    issueId: null,
    autoTriaged: false,
    createdAt: serverTimestamp(),
    createdAtIso: now,
  };
  const ref = await addDoc(collection(db, "shapeit_feedback"), payload);
  pushAudit({ action: "create_feedback", entity: "feedback", entityId: ref.id });
  return mapFeedback(ref.id, { ...payload, createdAtIso: now });
}

export async function acceptAsIssueRemote(feedbackId: string): Promise<Issue> {
  const fb = await getFeedbackRemote(feedbackId);
  if (!fb) throw new Error("投稿が見つかりません");
  const orgId = fb.organizationId || (await requireOrgId());
  const now = new Date().toISOString();
  const issuePayload = {
    uid: auth.currentUser?.uid ?? fb.uid,
    organizationId: orgId,
    title: fb.analysis?.title || fb.rawText.slice(0, 80),
    summary: fb.analysis?.summary || fb.rawText.slice(0, 200),
    category: fb.analysis?.category || "OTHER",
    severity: fb.analysis?.severity || "S3",
    priorityScore: fb.analysis?.priorityScore ?? 40,
    status: "todo",
    productArea: fb.analysis?.productArea || "",
    feedbackIds: [fb.id],
    createdAt: serverTimestamp(),
    createdAtIso: now,
    updatedAt: serverTimestamp(),
    updatedAtIso: now,
  };
  const ref = await addDoc(collection(db, "shapeit_issues"), issuePayload);
  await updateDoc(doc(db, "shapeit_feedback", fb.id), { triageStatus: "accepted", issueId: ref.id });
  pushAudit({ action: "accept_issue", entity: "issue", entityId: ref.id });
  return mapIssue(ref.id, issuePayload);
}

export async function mergeIntoIssueRemote(feedbackId: string, issueId: string) {
  const issue = await getIssueRemote(issueId);
  if (!issue) throw new Error("Issue が見つかりません");
  const ids = Array.from(new Set([...issue.feedbackIds, feedbackId]));
  await updateDoc(doc(db, "shapeit_issues", issueId), { feedbackIds: ids, updatedAt: serverTimestamp() });
  await updateDoc(doc(db, "shapeit_feedback", feedbackId), { triageStatus: "merged", issueId });
}

export async function rejectFeedbackRemote(feedbackId: string, reason: string) {
  await updateDoc(doc(db, "shapeit_feedback", feedbackId), {
    triageStatus: "rejected",
    rejectReason: reason,
  });
}

export async function snoozeFeedbackRemote(feedbackId: string, hours: number, untilIso?: string) {
  const until = untilIso || new Date(Date.now() + hours * 3600_000).toISOString();
  await updateDoc(doc(db, "shapeit_feedback", feedbackId), {
    triageStatus: "snoozed",
    snoozeUntil: until,
  });
}

export async function createManualIssueRemote(input: { title: string; summary?: string }): Promise<Issue> {
  const orgId = await requireOrgId();
  const now = new Date().toISOString();
  const payload = {
    uid: auth.currentUser?.uid,
    organizationId: orgId,
    title: input.title,
    summary: input.summary ?? "",
    category: "OTHER",
    severity: "S3",
    priorityScore: 30,
    status: "todo" as IssueStatus,
    productArea: "",
    feedbackIds: [] as string[],
    createdAt: serverTimestamp(),
    createdAtIso: now,
    updatedAt: serverTimestamp(),
    updatedAtIso: now,
  };
  const ref = await addDoc(collection(db, "shapeit_issues"), payload);
  return mapIssue(ref.id, payload);
}

export async function updateIssueRemote(id: string, patch: Partial<Issue>) {
  const { id: _id, ...rest } = patch;
  await updateDoc(doc(db, "shapeit_issues", id), {
    ...rest,
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  });
}

export async function updateIssueStatusRemote(id: string, status: IssueStatus) {
  const issue = await getIssueRemote(id);
  await updateDoc(doc(db, "shapeit_issues", id), {
    status,
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  });
  pushAudit({ action: "status", entity: "issue", entityId: id, before: issue?.status, after: status });
  if (status === "done" && issue) {
    await maybeWriteChangelog(issue);
    await notifyFeedbackAuthors(issue, "対応が完了しました。解決したか確認してください。");
  }
}

async function maybeWriteChangelog(issue: Issue) {
  const orgId = issue.organizationId;
  const existing = await getDocs(
    query(collection(db, "shapeit_changelog"), where("organizationId", "==", orgId), where("issueId", "==", issue.id)),
  );
  if (!existing.empty) return;
  const visibility = loadSettings().changelogDefaultPublic ? "public" : "internal";
  await addDoc(collection(db, "shapeit_changelog"), {
    organizationId: orgId,
    issueId: issue.id,
    title: issue.title,
    summary: issue.summary,
    visibility,
    releasedAt: new Date().toISOString(),
    createdAt: serverTimestamp(),
  });
}

async function notifyFeedbackAuthors(issue: Issue, body: string) {
  const seen = new Set<string>();
  for (const fid of issue.feedbackIds) {
    const fb = await getFeedbackRemote(fid);
    if (!fb || seen.has(fb.uid)) continue;
    seen.add(fb.uid);
    await addDoc(collection(db, "shapeit_notifications"), {
      uid: fb.uid,
      organizationId: issue.organizationId,
      kind: "issue_done",
      title: issue.title,
      body,
      href: "/my-feedback",
      read: false,
      createdAt: serverTimestamp(),
      createdAtIso: new Date().toISOString(),
    });
  }
}

export async function addIssueCommentRemote(issueId: string, body: string) {
  const user = auth.currentUser;
  if (!user || !body.trim()) return;
  await addDoc(collection(db, "shapeit_comments"), {
    issueId,
    uid: user.uid,
    authorName: user.displayName || user.email || "member",
    body: body.trim(),
    createdAt: serverTimestamp(),
    createdAtIso: new Date().toISOString(),
  });
}

export async function listIssueCommentsRemote(issueId: string): Promise<IssueComment[]> {
  const snap = await getDocs(query(collection(db, "shapeit_comments"), where("issueId", "==", issueId)));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      issueId,
      uid: String(data.uid ?? ""),
      authorName: String(data.authorName ?? ""),
      body: String(data.body ?? ""),
      createdAt: isoOf(data.createdAtIso ?? data.createdAt),
    };
  });
}

export async function listIssueActivitiesRemote(issueId: string) {
  return (await listIssueCommentsRemote(issueId)).map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
  }));
}

export async function linkIssuesRemote(
  fromId: string,
  toId: string,
  type: "related" | "duplicate" | "blocks" | "blocked_by",
) {
  const issue = await getIssueRemote(fromId);
  const relations = [...(issue?.relations ?? []), { issueId: toId, toId, type }];
  await updateIssueRemote(fromId, { relations });
}

export async function setVerificationRemote(feedbackId: string, verification: "solved" | "unsolved") {
  if (isDemo()) {
    const { setVerificationDemo } = await import("./demoStore");
    setVerificationDemo(feedbackId, verification);
    return;
  }
  const now = new Date().toISOString();
  await updateDoc(doc(db, "shapeit_feedback", feedbackId), { verification, updatedAtIso: now });
  if (verification === "unsolved") {
    const fb = await getFeedbackRemote(feedbackId);
    if (fb?.issueId) {
      const issue = await getIssueRemote(fb.issueId);
      if (issue?.status === "done") {
        await updateDoc(doc(db, "shapeit_issues", fb.issueId), {
          status: "verify",
          updatedAt: serverTimestamp(),
          updatedAtIso: now,
        });
        pushAudit({
          action: "reopen",
          entity: "issue",
          entityId: fb.issueId,
          before: "done",
          after: "verify",
        });
      }
    }
  }
}

export async function listChangelogRemote(): Promise<ChangelogEntry[]> {
  if (isDemo()) return listChangelog();
  const orgId = await requireOrgId();
  const snap = await getDocs(query(collection(db, "shapeit_changelog"), where("organizationId", "==", orgId)));
  const list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      organizationId: orgId,
      issueId: data.issueId ? String(data.issueId) : undefined,
      title: String(data.title ?? ""),
      summary: String(data.summary ?? ""),
      visibility: (data.visibility as "public" | "internal") || "internal",
      releasedAt: data.releasedAt ? String(data.releasedAt) : isoOf(data.createdAt),
    };
  });
  cache.changelog = list;
  return list;
}

export async function listPublicChangelogRemote(): Promise<ChangelogEntry[]> {
  const snap = await getDocs(query(collection(db, "shapeit_changelog"), where("visibility", "==", "public")));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      organizationId: String(data.organizationId ?? ""),
      title: String(data.title ?? ""),
      summary: String(data.summary ?? ""),
      visibility: "public" as const,
      releasedAt: data.releasedAt ? String(data.releasedAt) : isoOf(data.createdAt),
    };
  });
}

export async function updateChangelogRemote(
  id: string,
  patch: { title?: string; summary?: string; visibility?: "public" | "internal" },
) {
  await updateDoc(doc(db, "shapeit_changelog", id), patch);
}

export async function listNotificationsRemote(): Promise<AppNotification[]> {
  if (isDemo()) return listDemoNotifications();
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, "shapeit_notifications"), where("uid", "==", uid)));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid,
      title: String(data.title ?? ""),
      body: String(data.body ?? ""),
      read: Boolean(data.read),
      href: data.href ? String(data.href) : undefined,
      kind: data.kind as AppNotification["kind"],
      weekKey: data.weekKey ? String(data.weekKey) : undefined,
      createdAt: isoOf(data.createdAtIso ?? data.createdAt),
    };
  });
}

export function countUnreadWeeklyDigestNotifications(items: AppNotification[]): number {
  return items.filter((n) => n.kind === "weekly_digest" && !n.read).length;
}

export async function countUnreadWeeklyDigestRemote(): Promise<number> {
  const items = await listNotificationsRemote();
  return countUnreadWeeklyDigestNotifications(items);
}

export async function markWeeklyDigestNotificationsReadRemote() {
  const items = await listNotificationsRemote();
  const targets = items.filter((n) => n.kind === "weekly_digest" && !n.read);
  if (isDemo()) {
    for (const n of targets) markDemoNotificationRead(n.id);
    return;
  }
  await Promise.all(targets.map((n) => markNotificationReadRemote(n.id)));
}

export async function markNotificationReadRemote(id: string) {
  if (isDemo()) {
    markDemoNotificationRead(id);
    return;
  }
  await updateDoc(doc(db, "shapeit_notifications", id), { read: true });
}

export async function markAllNotificationsReadRemote() {
  if (isDemo()) {
    markAllDemoNotificationsRead();
    return;
  }
  const items = await listNotificationsRemote();
  await Promise.all(items.filter((n) => !n.read).map((n) => markNotificationReadRemote(n.id)));
}

export async function listPackMetaRemote(): Promise<FixPackMeta[]> {
  if (isDemo()) return [];
  const orgId = getCurrentOrgId();
  if (!orgId || orgId === "demo") return [];
  const snap = await getDocs(query(collection(db, "shapeit_fix_pack_meta"), where("organizationId", "==", orgId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FixPackMeta, "id">) }));
}

export async function getPackMetaRemote(pageKey: string): Promise<FixPackMeta | undefined> {
  const all = await listPackMetaRemote();
  return all.find((m) => m.pageKey === pageKey);
}

export async function upsertPackMetaRemote(
  pageKey: string,
  patch: Partial<FixPackMeta>,
): Promise<FixPackMeta> {
  const orgId = await requireOrgId();
  const existing = await getPackMetaRemote(pageKey);
  const id = existing?.id || pageKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const next: FixPackMeta = {
    id,
    pageKey,
    organizationId: orgId,
    uid: auth.currentUser?.uid ?? "",
    workStatus: "open",
    ...existing,
    ...patch,
  };
  await setDoc(doc(db, "shapeit_fix_pack_meta", id), next, { merge: true });
  return next;
}

export function searchRemote(q: string) {
  const needle = q.trim().toLowerCase();
  const issues = (isDemo() ? listIssues() : cache.issues).filter(
    (i) => !needle || i.title.toLowerCase().includes(needle) || i.summary.toLowerCase().includes(needle),
  );
  const feedback = (isDemo() ? listMyFeedback() : cache.feedback).filter(
    (f) => !needle || f.rawText.toLowerCase().includes(needle),
  );
  const changelog = (isDemo() ? listChangelog() : cache.changelog).filter(
    (c) => !needle || c.title.toLowerCase().includes(needle),
  );
  const nav = [
    { to: "/capture", label: "投稿" },
    { to: "/inbox", label: "Inbox" },
    { to: "/board", label: "Board" },
    { to: "/settings", label: "設定" },
  ].filter((n) => !needle || n.label.toLowerCase().includes(needle));
  return { issues, feedback, changelog, nav };
}
