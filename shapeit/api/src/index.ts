/**
 * ShapeIt API
 */
import cors from "cors";
import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { triageFeedback, ruleBasedTriage } from "./services/triage";
import { inviteOrgMember, getInvitePublic, acceptInvite, resolveOrgId, assertOrgAdmin } from "./services/invite";
import {
  buildWeeklyResponseDigest,
  publishWeeklyDigestForOrg,
  publishWeeklyDigestForAllOrgs,
} from "./services/weeklyDigest";
import { requireAuth, type AuthedRequest } from "./middleware/auth";
import { functionSecrets } from "./config/secrets";
import { GEMINI_MODEL } from "./config/gemini";
import { isMailConfigured } from "./services/mail";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (!getApps().length) initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "4mb" }));

const api = express.Router();

api.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "shapeit-api",
    product: "ShapeIt",
    gemini: Boolean(process.env.GEMINI_API_KEY),
    mail: isMailConfigured(),
  });
});

api.post("/v1/ai/triage", requireAuth, async (req: AuthedRequest, res) => {
  const { rawText, pageUrl } = req.body ?? {};
  if (!rawText || typeof rawText !== "string") {
    res.status(400).json({ error: "rawText が必要です" });
    return;
  }
  const analysis = await triageFeedback(String(rawText), pageUrl ? String(pageUrl) : undefined);
  res.json({
    analysis,
    model: analysis.model ?? (process.env.GEMINI_API_KEY ? GEMINI_MODEL : "shapeit-rules-v0"),
    triage_source: analysis.triageSource ?? (process.env.GEMINI_API_KEY ? "gemini" : "rules"),
    prompt_version: "v0.3",
    generated_at: new Date().toISOString(),
    confidence: analysis.confidence,
  });
});

api.post("/v1/feedback", requireAuth, async (req: AuthedRequest, res) => {
  const { rawText, pageUrl, pageTitle, screenshotUrl, screenshotDataUrl, source, browser, os, viewport } = req.body ?? {};
  if (!rawText || typeof rawText !== "string") {
    res.status(400).json({ error: "rawText が必要です" });
    return;
  }
  const uid = req.uid!;
  let orgId: string;
  try {
    orgId = await resolveOrgId(uid, req.email);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 403;
    const message = err instanceof Error ? err.message : "組織に所属していません";
    res.status(status).json({ error: message });
    return;
  }
  const analysis = ruleBasedTriage(String(rawText), pageUrl ? String(pageUrl) : undefined);
  const now = new Date().toISOString();
  const ref = await getFirestore().collection("shapeit_feedback").add({
    uid,
    organizationId: orgId,
    projectId: "default",
    rawText: String(rawText),
    pageUrl: pageUrl ?? null,
    pageTitle: pageTitle ?? null,
    screenshotUrl: screenshotUrl ?? null,
    screenshotDataUrl:
      typeof screenshotDataUrl === "string" && screenshotDataUrl.startsWith("data:image/")
        ? screenshotDataUrl.slice(0, 900_000)
        : null,
    browser: browser ?? null,
    os: os ?? null,
    viewport: viewport ?? null,
    authorName: req.email ?? uid,
    analysis,
    triageStatus: "pending",
    issueId: null,
    autoTriaged: false,
    source: source ?? "API",
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: now,
  });
  res.status(201).json({
    success: true,
    feedback: { id: ref.id, rawText, createdAt: now },
    analysis,
  });
});

/** API-003: Widget / Extension 向け Project Key（暫定: Firestore shapeit_project_keys） */
api.post("/v1/public/feedback", async (req, res) => {
  const key = String(req.header("X-ShapeIt-Key") || req.body?.projectKey || "");
  if (!key.startsWith("pk_")) {
    res.status(401).json({ error: "X-ShapeIt-Key が必要です" });
    return;
  }
  const { rawText, pageUrl, pageTitle, source } = req.body ?? {};
  if (!rawText || typeof rawText !== "string") {
    res.status(400).json({ error: "rawText が必要です" });
    return;
  }
  // キー検証（コレクションが無ければ demo キー形式のみ許可）
  const db = getFirestore();
  const snap = await db.collection("shapeit_project_keys").where("key", "==", key).limit(1).get();
  let orgId = "public";
  if (!snap.empty) {
    const data = snap.docs[0].data();
    if (data.enabled === false) {
      res.status(403).json({ error: "key revoked" });
      return;
    }
    orgId = String(data.organizationId || data.uid || "public");
  } else if (!key.startsWith("pk_live_")) {
    res.status(401).json({ error: "invalid key" });
    return;
  }

  const analysis = ruleBasedTriage(String(rawText), pageUrl ? String(pageUrl) : undefined);
  const now = new Date().toISOString();
  const ref = await db.collection("shapeit_feedback").add({
    uid: orgId,
    organizationId: orgId,
    projectId: "default",
    rawText: String(rawText),
    pageUrl: pageUrl ?? null,
    pageTitle: pageTitle ?? null,
    authorName: "public-api",
    analysis,
    triageStatus: "pending",
    issueId: null,
    autoTriaged: false,
    source: source ?? "API",
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: now,
  });
  res.status(201).json({ success: true, id: ref.id, analysis });
});

api.post("/v1/org/invite", requireAuth, async (req: AuthedRequest, res) => {
  const { email, role, orgName, organizationId } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email が必要です" });
    return;
  }
  try {
    const result = await inviteOrgMember({
      inviterUid: req.uid!,
      inviterEmail: req.email,
      email: String(email),
      role: typeof role === "string" ? role : "member",
      orgName: typeof orgName === "string" ? orgName : undefined,
      organizationId: typeof organizationId === "string" ? organizationId : undefined,
    });
    res.json({ ok: true, emailSent: result.emailSent, inviteUrl: result.inviteUrl });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "invite failed";
    res.status(status).json({ error: message });
  }
});

api.get("/v1/org/invite/:token", async (req, res) => {
  try {
    const result = await getInvitePublic(String(req.params.token));
    res.json(result);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "invite lookup failed";
    res.status(status).json({ error: message });
  }
});

api.post("/v1/org/invite/:token/accept", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await acceptInvite({
      token: String(req.params.token),
      uid: req.uid!,
      email: req.email,
      name: typeof req.body?.name === "string" ? req.body.name : undefined,
    });
    res.json({ ok: true, organizationId: result.organizationId });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "accept failed";
    res.status(status).json({ error: message });
  }
});

api.post("/v1/org/weekly-digest/publish", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const orgId = await assertOrgAdmin(req.uid!, req.email, req.body?.organizationId as string | undefined);
    const force = Boolean(req.body?.force);
    const result = await publishWeeklyDigestForOrg(orgId, { force });
    res.json(result);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "weekly digest failed";
    res.status(status).json({ error: message });
  }
});

api.post("/v1/org/weekly-digest/ensure", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const orgId = await resolveOrgId(req.uid!, req.email);
    const result = await publishWeeklyDigestForOrg(orgId);
    res.json(result);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 403;
    const message = err instanceof Error ? err.message : "weekly digest ensure failed";
    res.status(status).json({ error: message });
  }
});

api.get("/v1/org/weekly-digest/preview", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const orgId = await resolveOrgId(req.uid!, req.email);
    const digest = await buildWeeklyResponseDigest(orgId);
    res.json({ digest });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 403;
    const message = err instanceof Error ? err.message : "preview failed";
    res.status(status).json({ error: message });
  }
});

api.get("/v1/public/health", (_req, res) => {
  res.json({ ok: true, public: true });
});

app.use("/api", api);
app.use("/", api);

export const shapeitApi = onRequest(
  {
    region: "asia-northeast1",
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: [...functionSecrets],
  },
  app,
);

/** 毎週月曜 9:00 JST（UTC 0:00）に全 org へ週次サマリーを配信 */
export const shapeitWeeklyDigest = onSchedule(
  {
    schedule: "0 9 * * 1",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
    memory: "512MiB",
    timeoutSeconds: 300,
    secrets: [...functionSecrets],
  },
  async () => {
    const result = await publishWeeklyDigestForAllOrgs();
    console.info("shapeit weekly digest complete", result);
  },
);
