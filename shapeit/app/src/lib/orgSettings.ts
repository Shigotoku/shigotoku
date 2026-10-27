import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getCurrentOrgId } from "./org";
import { isLoggedIn as isDemo, loadSettings, saveSettings } from "./demoStore";

export interface OrgIntegrations {
  slackWebhookUrl: string;
  teamsWebhookUrl: string;
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

const DEFAULT_EVENTS: OrgIntegrations["outboundWebhookEvents"] = {
  feedback_created: true,
  issue_done: true,
  invite_sent: true,
  weekly_digest: true,
};

export function loadLocalIntegrations(): OrgIntegrations {
  const s = loadSettings();
  return {
    slackWebhookUrl: s.slackWebhookUrl ?? "",
    teamsWebhookUrl: s.teamsWebhookUrl ?? "",
    weeklyDigestEnabled: s.weeklyDigestEnabled ?? true,
    outboundWebhookEnabled: s.outboundWebhookEnabled ?? false,
    outboundWebhookUrl: s.outboundWebhookUrl ?? "",
    outboundWebhookSecret: s.outboundWebhookSecret ?? "",
    outboundWebhookEvents: { ...DEFAULT_EVENTS, ...s.outboundWebhookEvents },
    lastWeeklyDigestWeekKey: s.lastWeeklyDigestWeekKey,
    lastWeeklyDigestAtIso: s.lastWeeklyDigestAtIso,
  };
}

export async function loadOrgIntegrations(): Promise<OrgIntegrations> {
  if (isDemo()) return loadLocalIntegrations();
  const orgId = getCurrentOrgId();
  if (!orgId || orgId === "demo") return loadLocalIntegrations();
  const snap = await getDoc(doc(db, "shapeit_organizations", orgId));
  if (!snap.exists()) return loadLocalIntegrations();
  const data = snap.data();
  const events = (data.outboundWebhookEvents as Partial<OrgIntegrations["outboundWebhookEvents"]>) ?? {};
  return {
    slackWebhookUrl: String(data.slackWebhookUrl ?? ""),
    teamsWebhookUrl: String(data.teamsWebhookUrl ?? ""),
    weeklyDigestEnabled: data.weeklyDigestEnabled !== false,
    outboundWebhookEnabled: Boolean(data.outboundWebhookEnabled),
    outboundWebhookUrl: String(data.outboundWebhookUrl ?? ""),
    outboundWebhookSecret: String(data.outboundWebhookSecret ?? ""),
    outboundWebhookEvents: { ...DEFAULT_EVENTS, ...events },
    lastWeeklyDigestWeekKey: data.lastWeeklyDigestWeekKey ? String(data.lastWeeklyDigestWeekKey) : undefined,
    lastWeeklyDigestAtIso: data.lastWeeklyDigestAtIso ? String(data.lastWeeklyDigestAtIso) : undefined,
  };
}

export async function saveOrgIntegrations(patch: Partial<OrgIntegrations>): Promise<OrgIntegrations> {
  if (isDemo()) {
    saveSettings({
      slackWebhookUrl: patch.slackWebhookUrl,
      teamsWebhookUrl: patch.teamsWebhookUrl,
      weeklyDigestEnabled: patch.weeklyDigestEnabled,
      outboundWebhookEnabled: patch.outboundWebhookEnabled,
      outboundWebhookUrl: patch.outboundWebhookUrl,
      outboundWebhookSecret: patch.outboundWebhookSecret,
      outboundWebhookEvents: patch.outboundWebhookEvents,
      lastWeeklyDigestWeekKey: patch.lastWeeklyDigestWeekKey,
      lastWeeklyDigestAtIso: patch.lastWeeklyDigestAtIso,
    });
    return loadLocalIntegrations();
  }
  const orgId = getCurrentOrgId();
  if (!orgId || orgId === "demo") throw new Error("組織に所属していません");
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.slackWebhookUrl !== undefined) payload.slackWebhookUrl = patch.slackWebhookUrl.trim();
  if (patch.teamsWebhookUrl !== undefined) payload.teamsWebhookUrl = patch.teamsWebhookUrl.trim();
  if (patch.weeklyDigestEnabled !== undefined) payload.weeklyDigestEnabled = patch.weeklyDigestEnabled;
  if (patch.outboundWebhookEnabled !== undefined) payload.outboundWebhookEnabled = patch.outboundWebhookEnabled;
  if (patch.outboundWebhookUrl !== undefined) payload.outboundWebhookUrl = patch.outboundWebhookUrl.trim();
  if (patch.outboundWebhookSecret !== undefined) payload.outboundWebhookSecret = patch.outboundWebhookSecret;
  if (patch.outboundWebhookEvents !== undefined) payload.outboundWebhookEvents = patch.outboundWebhookEvents;
  if (patch.lastWeeklyDigestWeekKey !== undefined) payload.lastWeeklyDigestWeekKey = patch.lastWeeklyDigestWeekKey;
  if (patch.lastWeeklyDigestAtIso !== undefined) payload.lastWeeklyDigestAtIso = patch.lastWeeklyDigestAtIso;
  await updateDoc(doc(db, "shapeit_organizations", orgId), payload);
  return loadOrgIntegrations();
}
