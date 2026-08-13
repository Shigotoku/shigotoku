import type { ChangelogEntry, Feedback, Issue } from "./types";

export interface WeeklyCompletedItem {
  id: string;
  title: string;
  summary: string;
  issueId?: string;
  releasedAt?: string;
}

export interface WeeklyInProgressItem {
  id: string;
  title: string;
  status: string;
}

export interface WeeklyPersonalItem {
  feedbackId: string;
  rawText: string;
  triageStatus: string;
  issueId?: string | null;
  issueTitle?: string;
  verification?: string;
}

export interface WeeklyResponseDigest {
  weekKey: string;
  weekLabel: string;
  periodLabel: string;
  weekStart: string;
  weekEnd: string;
  newFeedbackCount: number;
  completedCount: number;
  inProgressCount: number;
  completedItems: WeeklyCompletedItem[];
  inProgressItems: WeeklyInProgressItem[];
  personalItems: WeeklyPersonalItem[];
}

const WEEK_MS = 7 * 86_400_000;

/** ISO week key (e.g. 2026-W33) in local calendar */
export function getWeekKey(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(((d.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function formatJaDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function computeWeeklyResponseDigest(input: {
  feedback: Feedback[];
  issues: Issue[];
  changelog: ChangelogEntry[];
  currentUid?: string;
  now?: number;
}): WeeklyResponseDigest {
  const now = input.now ?? Date.now();
  const weekEnd = new Date(now);
  const weekStart = new Date(now - WEEK_MS);
  const weekKey = getWeekKey(weekEnd);
  const periodLabel = `${formatJaDate(weekStart.toISOString())} – ${formatJaDate(weekEnd.toISOString())}`;

  const inWeek = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= weekStart.getTime() && t <= weekEnd.getTime();
  };

  const issueById = new Map(input.issues.map((i) => [i.id, i]));

  const completedFromChangelog = input.changelog
    .filter((c) => inWeek(c.releasedAt ?? c.createdAt ?? ""))
    .map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      issueId: c.issueId,
      releasedAt: c.releasedAt ?? c.createdAt,
    }));

  const completedFromIssues = input.issues
    .filter((i) => i.status === "done" && inWeek(i.updatedAt))
    .filter((i) => !completedFromChangelog.some((c) => c.issueId === i.id))
    .map((i) => ({
      id: `issue-${i.id}`,
      title: i.title,
      summary: i.summary,
      issueId: i.id,
      releasedAt: i.updatedAt,
    }));

  const completedItems = [...completedFromChangelog, ...completedFromIssues].slice(0, 30);

  const inProgressItems = input.issues
    .filter((i) => i.status !== "done" && i.status !== "archived")
    .filter((i) => i.feedbackIds.length > 0)
    .slice(0, 10)
    .map((i) => ({ id: i.id, title: i.title, status: i.status }));

  const newFeedbackCount = input.feedback.filter((f) => inWeek(f.createdAt)).length;

  let personalItems: WeeklyPersonalItem[] = [];
  if (input.currentUid) {
    personalItems = input.feedback
      .filter((f) => f.uid === input.currentUid)
      .filter((f) => f.issueId || f.triageStatus === "accepted" || f.triageStatus === "merged")
      .slice(0, 8)
      .map((f) => {
        const issue = f.issueId ? issueById.get(f.issueId) : undefined;
        return {
          feedbackId: f.id,
          rawText: f.rawText.slice(0, 120),
          triageStatus: f.triageStatus,
          issueId: f.issueId,
          issueTitle: issue?.title,
          verification: f.verification,
        };
      });
  }

  return {
    weekKey,
    weekLabel: weekEnd.toLocaleDateString("ja-JP"),
    periodLabel,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    newFeedbackCount,
    completedCount: completedItems.length,
    inProgressCount: inProgressItems.length,
    completedItems,
    inProgressItems,
    personalItems,
  };
}

export function generateWeeklyResponseSummaryText(d: WeeklyResponseDigest): string {
  const lines = [
    `# 今週の改善サマリー（${d.periodLabel}）`,
    "",
    `- 新規の声: ${d.newFeedbackCount}件`,
    `- 今週完了: ${d.completedCount}件`,
    `- 対応中: ${d.inProgressCount}件`,
    "",
  ];

  if (d.personalItems.length > 0) {
    lines.push("## あなたへの返事", "");
    for (const p of d.personalItems) {
      const status =
        p.verification === "solved"
          ? "解決済み"
          : p.verification === "unsolved"
            ? "未解決"
            : p.issueTitle
              ? `対応中（${p.issueTitle}）`
              : p.triageStatus;
      lines.push(`- 「${p.rawText}」→ ${status}`);
    }
    lines.push("");
  }

  lines.push("## チームで直したこと", "");
  if (d.completedItems.length === 0) {
    lines.push("- 今週の完了はまだありません");
  } else {
    for (const c of d.completedItems) {
      lines.push(`- ${c.title}`);
    }
  }

  if (d.inProgressItems.length > 0) {
    lines.push("", "## 対応中", "");
    for (const i of d.inProgressItems) {
      lines.push(`- ${i.title}（${i.status}）`);
    }
  }

  return lines.join("\n");
}

export function generateSlackWeeklyBlocks(d: WeeklyResponseDigest, appUrl: string): {
  text: string;
  blocks: unknown[];
} {
  const text = `今週の改善サマリー: 完了 ${d.completedCount}件 · 新規 ${d.newFeedbackCount}件`;
  const completedLines =
    d.completedItems.length === 0
      ? ["今週の完了はまだありません"]
      : d.completedItems.slice(0, 8).map((c) => `• ${c.title}`);

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "📬 今週の改善サマリー", emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*期間:* ${d.periodLabel}\n*新規:* ${d.newFeedbackCount}件 · *完了:* ${d.completedCount}件 · *対応中:* ${d.inProgressCount}件`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: "*チームで直したこと*\n" + completedLines.join("\n") },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Digest を開く", emoji: true },
          url: `${appUrl.replace(/\/$/, "")}/digest`,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Changelog", emoji: true },
          url: `${appUrl.replace(/\/$/, "")}/changelog`,
        },
      ],
    },
  ];

  return { text, blocks };
}
