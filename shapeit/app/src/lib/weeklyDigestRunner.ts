import { getIdToken } from "./firebase";
import { API_URL } from "./urls";
import { isLoggedIn as isDemo } from "./demoStore";
import { getCurrentOrgId } from "./org";
import {
  computeWeeklyResponseDigest,
  generateSlackWeeklyBlocks,
  generateWeeklyResponseSummaryText,
  getWeekKey,
  type WeeklyResponseDigest,
} from "./weeklyDigest";
import { listChangelog, listIssues, listMyFeedback } from "./demoStore";
import { pushDemoNotification } from "./notifications";
import { loadOrgIntegrations, saveOrgIntegrations } from "./orgSettings";
import { dispatchOutboundWebhook, dispatchSlackWebhook } from "./webhooks";
import {
  listChangelogRemote,
  listIssuesRemote,
  listOrgFeedbackRemote,
} from "./cloudStore";
import { auth } from "./firebase";

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || `API ${res.status}`);
  return body;
}

export async function fetchWeeklyResponseDigest(): Promise<WeeklyResponseDigest> {
  if (isDemo()) {
    const uid = "demo";
    const feedback = listMyFeedback();
    const issues = listIssues();
    const changelog = listChangelog();
    return computeWeeklyResponseDigest({
      feedback,
      issues,
      changelog,
      currentUid: uid,
    });
  }
  const uid = auth.currentUser?.uid;
  const [feedback, issues, changelog] = await Promise.all([
    listOrgFeedbackRemote(),
    listIssuesRemote(),
    listChangelogRemote(),
  ]);
  return computeWeeklyResponseDigest({
    feedback,
    issues,
    changelog,
    currentUid: uid,
  });
}

/** Demo: 週次サマリーをローカル生成し通知・Slack（可能なら）を送る */
export async function ensureDemoWeeklyDigest(): Promise<boolean> {
  const weekKey = getWeekKey();
  const settings = await loadOrgIntegrations();
  if (!settings.weeklyDigestEnabled) return false;
  if (settings.lastWeeklyDigestWeekKey === weekKey) return false;

  const digest = await fetchWeeklyResponseDigest();
  const summary = generateWeeklyResponseSummaryText(digest);

  pushDemoNotification({
    uid: "demo",
    kind: "weekly_digest",
    weekKey: digest.weekKey,
    title: "今週の改善サマリー",
    body: `完了 ${digest.completedCount}件 · 新規の声 ${digest.newFeedbackCount}件`,
    href: "/digest",
    read: false,
  });

  let slackSent = false;
  if (settings.slackWebhookUrl.startsWith("https://")) {
    const { text, blocks } = generateSlackWeeklyBlocks(digest, window.location.origin);
    slackSent = await dispatchSlackWebhook(settings.slackWebhookUrl, { text, blocks });
  }

  if (settings.outboundWebhookEnabled && settings.outboundWebhookUrl.startsWith("https://")) {
    if (settings.outboundWebhookEvents.weekly_digest) {
      await dispatchOutboundWebhook("weekly_digest", {
        weekKey: digest.weekKey,
        digest,
        summary,
        slackSent,
      });
    }
  }

  await saveOrgIntegrations({
    lastWeeklyDigestWeekKey: weekKey,
    lastWeeklyDigestAtIso: new Date().toISOString(),
  });
  return true;
}

export async function publishWeeklyDigestRemote(force = false): Promise<{
  published: boolean;
  weekKey: string;
  slackSent: boolean;
  memberCount: number;
}> {
  if (isDemo()) {
    const published = await ensureDemoWeeklyDigest();
    const settings = await loadOrgIntegrations();
    return {
      published,
      weekKey: settings.lastWeeklyDigestWeekKey ?? getWeekKey(),
      slackSent: published,
      memberCount: published ? 1 : 0,
    };
  }
  return apiJson("/v1/org/weekly-digest/publish", {
    method: "POST",
    body: JSON.stringify({ force }),
  });
}

export async function maybeEnsureWeeklyDigestOnLogin(): Promise<void> {
  const orgId = getCurrentOrgId();
  if (!orgId) return;
  if (isDemo()) {
    await ensureDemoWeeklyDigest();
    return;
  }
  try {
    await apiJson("/v1/org/weekly-digest/ensure", { method: "POST", body: "{}" });
  } catch {
    /* scheduler or admin will cover */
  }
}
