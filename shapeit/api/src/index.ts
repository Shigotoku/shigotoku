/**
 * ShapeIt API
 */
import cors from "cors";
import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { triageFeedback } from "./services/triage";
import { inviteOrgMember } from "./services/invite";
import { requireAuth, type AuthedRequest } from "./middleware/auth";
import { functionSecrets } from "./config/secrets";
import { GEMINI_MODEL } from "./config/gemini";

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
  const { rawText, pageUrl, pageTitle, screenshotUrl, source, browser, os, viewport } = req.body ?? {};
  if (!rawText || typeof rawText !== "string") {
    res.status(400).json({ error: "rawText が必要です" });
    return;
  }
  const uid = req.uid!;
  const orgId = process.env.SHAPEIT_DEFAULT_ORG_ID ?? "org_shigotoku";
  const analysis = await triageFeedback(String(rawText), pageUrl ? String(pageUrl) : undefined);
  const now = new Date().toISOString();
  const ref = await getFirestore().collection("shapeit_feedback").add({
    uid,
    organizationId: orgId,
    projectId: "default",
    rawText: String(rawText),
    pageUrl: pageUrl ?? null,
    pageTitle: pageTitle ?? null,
    screenshotUrl: screenshotUrl ?? null,
    screenshotDataUrl: null,
    browser: browser ?? null,
    os: os ?? null,
    viewport: viewport ?? null,
    authorName: req.email ?? uid,
    analysis,
    triageStatus: "pending",
    issueId: null,
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

  const analysis = await triageFeedback(String(rawText), pageUrl ? String(pageUrl) : undefined);
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
    source: source ?? "API",
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: now,
  });
  res.status(201).json({ success: true, id: ref.id, analysis });
});

api.post("/v1/org/invite", requireAuth, async (req: AuthedRequest, res) => {
  const { email, role, orgName } = req.body ?? {};
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
    });
    res.json({ ok: true, emailSent: result.emailSent });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "invite failed";
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
