import { FieldValue, getFirestore } from "firebase-admin/firestore";

const APP_URL = (process.env.SHAPEIT_APP_URL ?? "https://app.shapeit.shigotoku.com").replace(/\/$/, "");
const WEEK_MS = 7 * 86_400_000;

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
}

function getWeekKey(date = new Date()): string {
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

function isoOf(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value === "string" && value) return value;
  const ts = value as { toDate?: () => Date } | undefined;
  if (ts?.toDate) return ts.toDate().toISOString();
  return fallback;
}

export async function buildWeeklyResponseDigest(orgId: string): Promise<WeeklyResponseDigest> {
  const db = getFirestore();
  const now = Date.now();
  const weekEnd = new Date(now);
  const weekStart = new Date(now - WEEK_MS);
  const weekKey = getWeekKey(weekEnd);
  const periodLabel = `${formatJaDate(weekStart.toISOString())} – ${formatJaDate(weekEnd.toISOString())}`;

  const inWeek = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= weekStart.getTime() && t <= weekEnd.getTime();
  };

  const [fbSnap, issueSnap, clSnap] = await Promise.all([
    db.collection("shapeit_feedback").where("organizationId", "==", orgId).get(),
    db.collection("shapeit_issues").where("organizationId", "==", orgId).get(),
    db.collection("shapeit_changelog").where("organizationId", "==", orgId).get(),
  ]);

  const feedback = fbSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown> & { id: string }));
  const issues = issueSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown> & { id: string }));
  const changelog = clSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown> & { id: string }));

  const completedFromChangelog = changelog
    .filter((c) => inWeek(String(c.releasedAt ?? c.createdAtIso ?? "")))
    .map((c) => ({
      id: String(c.id),
      title: String(c.title ?? ""),
      summary: String(c.summary ?? ""),
      issueId: c.issueId ? String(c.issueId) : undefined,
      releasedAt: c.releasedAt ? String(c.releasedAt) : isoOf(c.createdAt),
    }));

  const completedFromIssues = issues
    .filter((i) => String(i.status) === "done" && inWeek(isoOf(i.updatedAtIso ?? i.updatedAt)))
    .filter((i) => !completedFromChangelog.some((c) => c.issueId === String(i.id)))
    .map((i) => ({
      id: `issue-${i.id}`,
      title: String(i.title ?? ""),
      summary: String(i.summary ?? ""),
      issueId: String(i.id),
      releasedAt: isoOf(i.updatedAtIso ?? i.updatedAt),
    }));

  const completedItems = [...completedFromChangelog, ...completedFromIssues].slice(0, 30);

  const inProgressItems = issues
    .filter((i) => i.status !== "done" && i.status !== "archived")
    .filter((i) => Array.isArray(i.feedbackIds) && i.feedbackIds.length > 0)
    .slice(0, 10)
    .map((i) => ({
      id: String(i.id),
      title: String(i.title ?? ""),
      status: String(i.status ?? "todo"),
    }));

  const newFeedbackCount = feedback.filter((f) => inWeek(isoOf(f.createdAtIso ?? f.createdAt))).length;

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
  };
}

export async function postSlackWeeklyDigest(
  webhookUrl: string,
  digest: WeeklyResponseDigest,
): Promise<boolean> {
  const completedLines =
    digest.completedItems.length === 0
      ? ["今週の完了はまだありません"]
      : digest.completedItems.slice(0, 8).map((c) => `• ${c.title}`);

  const payload = {
    text: `今週の改善サマリー: 完了 ${digest.completedCount}件 · 新規 ${digest.newFeedbackCount}件`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📬 今週の改善サマリー", emoji: true },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*期間:* ${digest.periodLabel}\n*新規:* ${digest.newFeedbackCount}件 · *完了:* ${digest.completedCount}件 · *対応中:* ${digest.inProgressCount}件`,
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
            url: `${APP_URL}/digest`,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Changelog", emoji: true },
            url: `${APP_URL}/changelog`,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn("shapeit weekly digest slack error", err);
    return false;
  }
}

export async function postOutboundWebhook(
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const body = JSON.stringify({ event, at: new Date().toISOString(), payload });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-ShapeIt-Event": event,
  };
  if (secret) {
    const { createHmac } = await import("node:crypto");
    headers["X-ShapeIt-Signature"] = createHmac("sha256", secret).update(body).digest("hex");
  }
  try {
    const res = await fetch(url, { method: "POST", headers, body });
    return res.ok;
  } catch (err) {
    console.warn("shapeit weekly digest webhook error", err);
    return false;
  }
}

export async function publishWeeklyDigestForOrg(
  orgId: string,
  options?: { force?: boolean },
): Promise<{
  published: boolean;
  weekKey: string;
  slackSent: boolean;
  webhookSent: boolean;
  memberCount: number;
}> {
  const db = getFirestore();
  const orgRef = db.collection("shapeit_organizations").doc(orgId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) {
    throw Object.assign(new Error("組織が見つかりません"), { status: 404 });
  }
  const org = orgSnap.data() ?? {};
  if (org.weeklyDigestEnabled === false) {
    return { published: false, weekKey: getWeekKey(), slackSent: false, webhookSent: false, memberCount: 0 };
  }

  const digest = await buildWeeklyResponseDigest(orgId);
  const lastKey = org.lastWeeklyDigestWeekKey ? String(org.lastWeeklyDigestWeekKey) : "";
  if (!options?.force && lastKey === digest.weekKey) {
    return {
      published: false,
      weekKey: digest.weekKey,
      slackSent: false,
      webhookSent: false,
      memberCount: 0,
    };
  }

  const membersSnap = await orgRef.collection("members").get();
  const memberUids = membersSnap.docs.map((d) => d.id);
  const now = new Date().toISOString();
  const summaryText = [
    `今週の改善サマリー（${digest.periodLabel}）`,
    `新規 ${digest.newFeedbackCount}件 · 完了 ${digest.completedCount}件 · 対応中 ${digest.inProgressCount}件`,
  ].join("\n");

  await db.collection("shapeit_weekly_digests").add({
    organizationId: orgId,
    weekKey: digest.weekKey,
    periodLabel: digest.periodLabel,
    digest,
    summaryText,
    publishedAt: now,
    createdAt: FieldValue.serverTimestamp(),
  });

  const batchLimit = 400;
  for (let i = 0; i < memberUids.length; i += batchLimit) {
    const chunk = memberUids.slice(i, i + batchLimit);
    const batch = db.batch();
    for (const uid of chunk) {
      const ref = db.collection("shapeit_notifications").doc();
      batch.set(ref, {
        uid,
        organizationId: orgId,
        kind: "weekly_digest",
        weekKey: digest.weekKey,
        title: "今週の改善サマリー",
        body: `完了 ${digest.completedCount}件 · 新規の声 ${digest.newFeedbackCount}件`,
        href: "/digest",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: now,
      });
    }
    await batch.commit();
  }

  let slackSent = false;
  const slackUrl = org.slackWebhookUrl ? String(org.slackWebhookUrl).trim() : "";
  if (slackUrl.startsWith("https://")) {
    slackSent = await postSlackWeeklyDigest(slackUrl, digest);
  }

  let webhookSent = false;
  const webhookUrl = org.outboundWebhookUrl ? String(org.outboundWebhookUrl).trim() : "";
  const webhookEnabled = Boolean(org.outboundWebhookEnabled);
  const webhookEvents = (org.outboundWebhookEvents as Record<string, boolean> | undefined) ?? {};
  if (
    webhookEnabled &&
    webhookUrl.startsWith("https://") &&
    (webhookEvents.weekly_digest ?? true)
  ) {
    webhookSent = await postOutboundWebhook(
      webhookUrl,
      String(org.outboundWebhookSecret ?? ""),
      "weekly_digest",
      { organizationId: orgId, weekKey: digest.weekKey, digest },
    );
  }

  await orgRef.set(
    {
      lastWeeklyDigestWeekKey: digest.weekKey,
      lastWeeklyDigestAt: FieldValue.serverTimestamp(),
      lastWeeklyDigestAtIso: now,
      lastWeeklyDigestSlackSent: slackSent,
    },
    { merge: true },
  );

  return {
    published: true,
    weekKey: digest.weekKey,
    slackSent,
    webhookSent,
    memberCount: memberUids.length,
  };
}

export async function publishWeeklyDigestForAllOrgs(): Promise<{ orgs: number; published: number }> {
  const db = getFirestore();
  const snap = await db.collection("shapeit_organizations").get();
  let published = 0;
  for (const doc of snap.docs) {
    try {
      const result = await publishWeeklyDigestForOrg(doc.id);
      if (result.published) published += 1;
    } catch (err) {
      console.warn("shapeit weekly digest org failed", doc.id, err);
    }
  }
  return { orgs: snap.size, published };
}

export { getWeekKey };
