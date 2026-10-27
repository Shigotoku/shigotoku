export type FeedbackSource =
  | "APP_WIDGET"
  | "WEB_FORM"
  | "CHROME_EXTENSION"
  | "MOBILE_PWA"
  | "SHARE_TARGET"
  | "CSV_IMPORT"
  | "API";

export type TriageStatus = "pending" | "accepted" | "merged" | "snoozed" | "rejected";
export type IssueStatus = "todo" | "in_progress" | "review" | "verify" | "done" | "archived";
export type IssueCategory =
  | "BUG"
  | "UX"
  | "UI"
  | "FEATURE"
  | "COPY"
  | "PERFORMANCE"
  | "SECURITY"
  | "DATA"
  | "INTEGRATION"
  | "OPERATION"
  | "IDEA"
  | "OTHER";
export type Severity = "S0" | "S1" | "S2" | "S3";
export type Effort = "S" | "M" | "L" | "XL";
export type RoadmapBucket = "now" | "next" | "later" | "none";
export type Verification = "solved" | "unsolved" | "pending";

export interface Analysis {
  title: string;
  summary: string;
  category: string;
  severity: Severity;
  productArea: string;
  priorityScore: number;
  priorityReasons: string[];
  confidence: number;
  reproductionSteps: string[];
  developerSummary: string;
  severityReason?: string;
  triageSource?: "gemini" | "rules";
  model?: string;
}

export interface Feedback {
  id: string;
  uid: string;
  organizationId: string;
  projectId?: string;
  rawText: string;
  pageUrl?: string;
  pageTitle?: string;
  screenshotDataUrl?: string;
  screenshotUrl?: string;
  audioDataUrl?: string;
  consoleSnippet?: string;
  browser?: string;
  os?: string;
  viewport?: string;
  appVersion?: string;
  environment?: string;
  source?: FeedbackSource;
  authorName: string;
  authorEmail?: string;
  captureMode?: string;
  extensionVersion?: string;
  referrer?: string;
  timezone?: string;
  analysis?: Analysis;
  triageStatus: TriageStatus;
  issueId?: string | null;
  snoozeUntil?: string;
  rejectReason?: string;
  adminSummary?: string;
  detectedLang?: string;
  autoTriaged?: boolean;
  verification?: Verification;
  createdAt: string;
  createdAtIso?: string;
  updatedAt?: string;
}

export interface IssueRelation {
  issueId: string;
  toId?: string;
  type: "related" | "duplicate" | "blocks" | "blocked_by";
}

export interface Issue {
  id: string;
  uid?: string;
  organizationId?: string;
  title: string;
  summary: string;
  category: IssueCategory | string;
  severity: Severity | string;
  priorityScore: number;
  priorityOverride?: number | null;
  priorityOverrideReason?: string;
  status: IssueStatus;
  productArea: string;
  assignee?: string | null;
  feedbackIds: string[];
  effort?: Effort;
  votes?: number;
  customerCount?: number;
  strategicFit?: number;
  arrImpact?: number;
  roadmapBucket?: RoadmapBucket;
  dueAt?: string;
  dueDate?: string;
  release?: string;
  segment?: string;
  initiative?: string;
  branchName?: string;
  prUrl?: string;
  relations?: IssueRelation[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  uid: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ChangelogEntry {
  id: string;
  organizationId: string;
  issueId?: string;
  title: string;
  summary: string;
  visibility: "public" | "internal";
  releasedAt?: string;
  createdAt?: string;
}

export type NotificationKind = "weekly_digest" | "issue_done" | "general";

export interface AppNotification {
  id: string;
  uid: string;
  title: string;
  body: string;
  read?: boolean;
  href?: string;
  kind?: NotificationKind;
  weekKey?: string;
  createdAt: string;
}
