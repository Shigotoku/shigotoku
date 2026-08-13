import type { ChangelogEntry, Effort, Feedback, FeedbackSource, Issue, IssueStatus } from "./types";

const DEMO_FLAG = "shapeit:demo:v1";
const SETTINGS_KEY = "shapeit:settings:v1";
const FB_KEY = "shapeit:feedback:v1";
const ISSUE_KEY = "shapeit:issues:v1";
const CL_KEY = "shapeit:changelog:v1";
const ONB_KEY = "shapeit:onboarding:done";
const VIEWS_KEY = "shapeit:views:v1";
const CORR_KEY = "shapeit:corrections:v1";

export interface DemoSettings {
  companyName: string;
  displayName: string;
  autoTriageEnabled: boolean;
  autoTriageMinConfidence: number;
  triageSlaHours: number;
  timezone: string;
  locale: "ja" | "en";
  environmentOverride: string;
  dataResidency: "tokyo" | "eu" | "us";
  sessionTimeoutMinutes: number;
  mfaRequired: boolean;
  changelogDefaultPublic: boolean;
  notifyIssueDone: boolean;
  notifyRejected: boolean;
  notifyVerification: boolean;
  notifyAutoTriage: boolean;
  notifyDueSoon: boolean;
  notifyAssignee: boolean;
  notifyMention: boolean;
  notifySla: boolean;
  maskPrivateHints: boolean;
  saveOriginalScreenshot: boolean;
  autoMaskPii: boolean;
  retentionDays: number;
  githubRepo: string;
  slackWebhookUrl: string;
  teamsWebhookUrl: string;
  portalToken: string;
  weeklyDigestEnabled: boolean;
  outboundWebhookEnabled: boolean;
  outboundWebhookUrl: string;
  outboundWebhookSecret: string;
  outboundWebhookEvents: {
    feedback_created: boolean;
    issue_done: boolean;
    invite_sent: boolean;
    weekly_digest: boolean;
  };
  lastWeeklyDigestWeekKey?: string;
  lastWeeklyDigestAtIso?: string;
}

const DEFAULT_SETTINGS: DemoSettings = {
  companyName: "デモ株式会社",
  displayName: "デモユーザー",
  autoTriageEnabled: false,
  autoTriageMinConfidence: 0.7,
  triageSlaHours: 24,
  timezone: "Asia/Tokyo",
  locale: "ja",
  environmentOverride: "",
  dataResidency: "tokyo",
  sessionTimeoutMinutes: 480,
  mfaRequired: false,
  changelogDefaultPublic: true,
  notifyIssueDone: true,
  notifyRejected: true,
  notifyVerification: true,
  notifyAutoTriage: false,
  notifyDueSoon: true,
  notifyAssignee: true,
  notifyMention: true,
  notifySla: true,
  maskPrivateHints: true,
  saveOriginalScreenshot: false,
  autoMaskPii: true,
  retentionDays: 90,
  githubRepo: "",
  slackWebhookUrl: "",
  teamsWebhookUrl: "",
  portalToken: "",
  weeklyDigestEnabled: true,
  outboundWebhookEnabled: false,
  outboundWebhookUrl: "",
  outboundWebhookSecret: "",
  outboundWebhookEvents: {
    feedback_created: true,
    issue_done: true,
    invite_sent: true,
    weekly_digest: true,
  },
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loginDemo() {
  localStorage.setItem(DEMO_FLAG, "1");
}

export function logoutDemo() {
  localStorage.removeItem(DEMO_FLAG);
}

export function isLoggedIn() {
  return localStorage.getItem(DEMO_FLAG) === "1";
}

export const isDemoLoggedIn = isLoggedIn;

export function loadSettings(): DemoSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<DemoSettings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(patch: Partial<DemoSettings>): DemoSettings {
  const next = { ...loadSettings(), ...patch };
  write(SETTINGS_KEY, next);
  return next;
}

export function isOnboardingDone() {
  return localStorage.getItem(ONB_KEY) === "1";
}

export function markOnboardingDone() {
  localStorage.setItem(ONB_KEY, "1");
}

export function ensurePortalToken() {
  const s = loadSettings();
  if (s.portalToken) return s.portalToken;
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  saveSettings({ portalToken: token });
  return token;
}

function nowIso() {
  return new Date().toISOString();
}

function sampleFeedback(): Feedback[] {
  const t = nowIso();
  return [
    {
      id: "fb-demo-1",
      uid: "demo",
      organizationId: "demo",
      rawText: "保存ボタンがどこにあるか分かりにくいです。",
      pageUrl: "https://app.example.com/settings",
      pageTitle: "設定",
      authorName: "デモユーザー",
      source: "APP_WIDGET",
      triageStatus: "pending",
      analysis: {
        title: "保存ボタンが分かりにくい",
        summary: "設定画面の保存導線が弱い",
        category: "UX",
        severity: "S2",
        productArea: "Settings",
        priorityScore: 55,
        priorityReasons: ["再現しやすい", "設定の完了を阻害"],
        confidence: 0.82,
        reproductionSteps: ["設定を開く", "変更する", "保存を探す"],
        developerSummary: "設定フッターに Primary の保存を固定する",
      },
      createdAt: t,
    },
  ];
}

function sampleIssues(): Issue[] {
  const t = nowIso();
  return [
    {
      id: "is-demo-1",
      organizationId: "demo",
      title: "オンボーディングの次へが進みにくい",
      summary: "初回セットアップの CTA が弱い",
      category: "UX",
      severity: "S2",
      priorityScore: 48,
      status: "todo",
      productArea: "Onboarding",
      feedbackIds: [],
      createdAt: t,
      updatedAt: t,
    },
  ];
}

export function seedIfEmpty() {
  if (read<Feedback[]>(FB_KEY, []).length === 0) write(FB_KEY, sampleFeedback());
  if (read<Issue[]>(ISSUE_KEY, []).length === 0) write(ISSUE_KEY, sampleIssues());
}

export function resetDemoData() {
  write(FB_KEY, sampleFeedback());
  write(ISSUE_KEY, sampleIssues());
  write(CL_KEY, []);
}

export function listMyFeedback(): Feedback[] {
  return read<Feedback[]>(FB_KEY, []);
}

export function listPendingFeedback(): Feedback[] {
  return listMyFeedback().filter((f) => f.triageStatus === "pending" || f.triageStatus === "snoozed");
}

export function listIssues(): Issue[] {
  return read<Issue[]>(ISSUE_KEY, []);
}

export function listChangelog(): ChangelogEntry[] {
  return read<ChangelogEntry[]>(CL_KEY, []);
}

export function createFeedback(input: {
  rawText: string;
  pageUrl?: string;
  source?: FeedbackSource;
}): Feedback {
  const fb: Feedback = {
    id: crypto.randomUUID(),
    uid: "demo",
    organizationId: "demo",
    rawText: input.rawText,
    pageUrl: input.pageUrl,
    authorName: loadSettings().displayName || "デモユーザー",
    source: input.source ?? "APP_WIDGET",
    triageStatus: "pending",
    createdAt: nowIso(),
  };
  write(FB_KEY, [fb, ...listMyFeedback()]);
  return fb;
}

export function updateFeedbackAnalysisDemo(
  feedbackId: string,
  analysis: Feedback["analysis"],
) {
  write(
    FB_KEY,
    listMyFeedback().map((f) =>
      f.id === feedbackId ? { ...f, analysis, autoTriaged: analysis?.triageSource === "gemini", updatedAt: nowIso() } : f,
    ),
  );
}

export function setVerificationDemo(feedbackId: string, verification: "solved" | "unsolved") {
  const now = nowIso();
  write(
    FB_KEY,
    listMyFeedback().map((f) =>
      f.id === feedbackId ? { ...f, verification, updatedAt: now } : f,
    ),
  );
  if (verification === "unsolved") {
    const fb = listMyFeedback().find((f) => f.id === feedbackId);
    if (fb?.issueId) {
      write(
        ISSUE_KEY,
        listIssues().map((i) =>
          i.id === fb.issueId && i.status === "done" ? { ...i, status: "verify", updatedAt: now } : i,
        ),
      );
    }
  }
}

export function anonymizeMyData() {
  write(
    FB_KEY,
    listMyFeedback().map((f) => ({ ...f, authorName: "匿名", rawText: "(匿名化)" })),
  );
}

export function deleteAllMyData() {
  write(FB_KEY, []);
  write(ISSUE_KEY, []);
  write(CL_KEY, []);
}

export function formatInTz(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ja-JP", { timeZone: loadSettings().timezone });
  } catch {
    return iso;
  }
}

export function runReminderSweep() {
  /* demo no-op */
}

export function suggestAssignees(_area: string): string[] {
  return ["デモユーザー"];
}

export function listCorrections(): { id: string; issueId: string; field: string; before: string; after: string; note?: string }[] {
  return read(CORR_KEY, []);
}

export interface SavedView {
  id: string;
  name: string;
  category: string;
  severity: string;
  area: string;
  assignee: string;
  minPriority: string;
  q: string;
}

export function listSavedViews(): SavedView[] {
  return read(VIEWS_KEY, []);
}

export function saveSavedView(view: Omit<SavedView, "id"> & { id?: string }): SavedView {
  const next: SavedView = { ...view, id: view.id || crypto.randomUUID() };
  write(VIEWS_KEY, [next, ...listSavedViews().filter((v) => v.id !== next.id)]);
  return next;
}

export function deleteSavedView(id: string) {
  write(
    VIEWS_KEY,
    listSavedViews().filter((v) => v.id !== id),
  );
}

export function setEffort(issueId: string, effort: Effort) {
  write(
    ISSUE_KEY,
    listIssues().map((i) => (i.id === issueId ? { ...i, effort, updatedAt: nowIso() } : i)),
  );
}

export function computeIceRanking() {
  const effortW: Record<Effort, number> = { S: 1, M: 2, L: 3, XL: 5 };
  return listIssues()
    .filter((i) => i.status !== "archived" && i.status !== "done")
    .map((issue) => {
      const impact = Math.round((issue.priorityOverride ?? issue.priorityScore) / 10);
      const confidence = 7;
      const effort = effortW[issue.effort ?? "M"];
      return { issue, impact, confidence, effort, ice: (impact * confidence) / effort };
    })
    .sort((a, b) => b.ice - a.ice);
}

export function computeDigest() {
  const feedback = listMyFeedback();
  const issues = listIssues();
  const weekAgo = Date.now() - 7 * 86400_000;
  const inWeek = (iso: string) => new Date(iso).getTime() >= weekAgo;
  const newFeedback = feedback.filter((f) => inWeek(f.createdAt));
  const critical = issues.filter((i) => i.severity === "S0" || i.severity === "S1");
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
    pendingTriage: listPendingFeedback().length,
    criticalCount: critical.length,
    slaBreaches,
    reopened: reopenedItems.length,
    autoTriageRate: 0,
    surging: issues.slice(0, 3),
    critical,
    reopenedItems,
  };
}

export function computeInsights() {
  const feedback = listMyFeedback();
  const issues = listIssues();
  return {
    feedbackCount: feedback.length,
    issueCount: issues.length,
    pendingTriage: listPendingFeedback().length,
    resolved: issues.filter((i) => i.status === "done").length,
    duplicateRate: 0,
    autoTriageRate: 0,
    aiAcceptanceHint: 0,
    correctionCount: listCorrections().length,
    uniqueAuthors: 1,
    medianResolutionHours: null as number | null,
    changelogCount: listChangelog().length,
    slaBreaches: 0,
    byArea: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byUrl: {} as Record<string, number>,
    openByStatus: {
      todo: issues.filter((i) => i.status === "todo").length,
      in_progress: issues.filter((i) => i.status === "in_progress").length,
      review: issues.filter((i) => i.status === "review").length,
      verify: issues.filter((i) => i.status === "verify").length,
    },
  };
}

export function updateIssueStatus(id: string, status: IssueStatus) {
  write(
    ISSUE_KEY,
    listIssues().map((i) => (i.id === id ? { ...i, status, updatedAt: nowIso() } : i)),
  );
}
