"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shapeitWeeklyDigest = exports.shapeitApi = void 0;
/**
 * ShapeIt API
 */
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const triage_1 = require("./services/triage");
const invite_1 = require("./services/invite");
const author_1 = require("./services/author");
const weeklyDigest_1 = require("./services/weeklyDigest");
const auth_1 = require("./middleware/auth");
const secrets_1 = require("./config/secrets");
const gemini_1 = require("./config/gemini");
const mail_1 = require("./services/mail");
const scheduler_1 = require("firebase-functions/v2/scheduler");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json({ limit: "4mb" }));
const api = express_1.default.Router();
api.get("/health", (_req, res) => {
    res.json({
        ok: true,
        service: "shapeit-api",
        product: "ShapeIt",
        gemini: Boolean(process.env.GEMINI_API_KEY),
        mail: (0, mail_1.isMailConfigured)(),
    });
});
api.post("/v1/ai/triage", auth_1.requireAuth, async (req, res) => {
    const { rawText, pageUrl } = req.body ?? {};
    if (!rawText || typeof rawText !== "string") {
        res.status(400).json({ error: "rawText が必要です" });
        return;
    }
    const analysis = await (0, triage_1.triageFeedback)(String(rawText), pageUrl ? String(pageUrl) : undefined);
    res.json({
        analysis,
        model: analysis.model ?? (process.env.GEMINI_API_KEY ? gemini_1.GEMINI_MODEL : "shapeit-rules-v0"),
        triage_source: analysis.triageSource ?? (process.env.GEMINI_API_KEY ? "gemini" : "rules"),
        prompt_version: "v0.3",
        generated_at: new Date().toISOString(),
        confidence: analysis.confidence,
    });
});
api.post("/v1/feedback", auth_1.requireAuth, async (req, res) => {
    const { rawText, pageUrl, pageTitle, screenshotUrl, screenshotDataUrl, source, browser, os, viewport, authorDisplayName, authorEmail, captureMode, extensionVersion, userAgent, referrer, timezone, locale, screenSize, devicePixelRatio, consoleSnippet, elementSelector, elementTag, } = req.body ?? {};
    if (!rawText || typeof rawText !== "string") {
        res.status(400).json({ error: "rawText が必要です" });
        return;
    }
    const uid = req.uid;
    let orgId;
    try {
        orgId = await (0, invite_1.resolveOrgId)(uid, req.email);
    }
    catch (err) {
        const status = err.status ?? 403;
        const message = err instanceof Error ? err.message : "組織に所属していません";
        res.status(status).json({ error: message });
        return;
    }
    const authorName = await (0, author_1.resolveAuthorName)(uid, typeof authorEmail === "string" ? authorEmail : req.email, typeof authorDisplayName === "string" ? authorDisplayName : undefined);
    const analysis = (0, triage_1.ruleBasedTriage)(String(rawText), pageUrl ? String(pageUrl) : undefined);
    const now = new Date().toISOString();
    const ref = await (0, firestore_1.getFirestore)().collection("shapeit_feedback").add({
        uid,
        organizationId: orgId,
        projectId: "default",
        rawText: String(rawText),
        pageUrl: pageUrl ?? null,
        pageTitle: pageTitle ?? null,
        screenshotUrl: screenshotUrl ?? null,
        screenshotDataUrl: typeof screenshotDataUrl === "string" && screenshotDataUrl.startsWith("data:image/")
            ? screenshotDataUrl.slice(0, 900_000)
            : null,
        browser: browser ?? (typeof userAgent === "string" ? userAgent : null),
        os: os ?? null,
        viewport: viewport ?? (typeof screenSize === "string" ? screenSize : null),
        authorName,
        authorEmail: (typeof authorEmail === "string" ? authorEmail : req.email) ?? null,
        captureMode: captureMode ?? null,
        extensionVersion: extensionVersion ?? null,
        referrer: referrer ?? null,
        timezone: timezone ?? null,
        locale: locale ?? null,
        devicePixelRatio: devicePixelRatio != null ? Number(devicePixelRatio) : null,
        consoleSnippet: consoleSnippet ?? null,
        elementSelector: typeof elementSelector === "string" ? elementSelector : null,
        elementTag: typeof elementTag === "string" ? elementTag : null,
        analysis,
        triageStatus: "pending",
        issueId: null,
        autoTriaged: false,
        source: source ?? "API",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        createdAtIso: now,
    });
    res.status(201).json({
        success: true,
        id: ref.id,
        feedback: { id: ref.id, rawText, createdAt: now },
        analysis,
    });
});
function textSimilarity(a, b) {
    const na = a.trim().toLowerCase();
    const nb = b.trim().toLowerCase();
    if (!na || !nb)
        return 0;
    if (na === nb)
        return 1;
    if (na.includes(nb.slice(0, Math.min(12, nb.length))) || nb.includes(na.slice(0, Math.min(12, na.length)))) {
        return 0.75;
    }
    const wordsA = na.match(/[一-龯ぁ-んァ-ンa-z0-9]{2,}/g) ?? [];
    const wordsB = new Set(nb.match(/[一-龯ぁ-んァ-ンa-z0-9]{2,}/g) ?? []);
    if (!wordsA.length)
        return 0;
    let hit = 0;
    for (const w of wordsA)
        if (wordsB.has(w))
            hit++;
    return hit / wordsA.length;
}
api.post("/v1/feedback/check-duplicates", auth_1.requireAuth, async (req, res) => {
    const { rawText } = req.body ?? {};
    if (!rawText || typeof rawText !== "string") {
        res.json({ duplicates: [] });
        return;
    }
    let orgId;
    try {
        orgId = await (0, invite_1.resolveOrgId)(req.uid, req.email);
    }
    catch {
        res.json({ duplicates: [] });
        return;
    }
    const snap = await (0, firestore_1.getFirestore)()
        .collection("shapeit_feedback")
        .where("organizationId", "==", orgId)
        .limit(40)
        .get();
    const duplicates = snap.docs
        .map((doc) => {
        const data = doc.data();
        const title = String(data.analysis?.title ?? data.rawText ?? "").slice(0, 80);
        const score = textSimilarity(String(rawText), String(data.rawText ?? ""));
        return { id: doc.id, title, score };
    })
        .filter((d) => d.score >= 0.45)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    res.json({ duplicates });
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
    const db = (0, firestore_1.getFirestore)();
    const snap = await db.collection("shapeit_project_keys").where("key", "==", key).limit(1).get();
    let orgId = "public";
    if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.enabled === false) {
            res.status(403).json({ error: "key revoked" });
            return;
        }
        orgId = String(data.organizationId || data.uid || "public");
    }
    else if (!key.startsWith("pk_live_")) {
        res.status(401).json({ error: "invalid key" });
        return;
    }
    const analysis = (0, triage_1.ruleBasedTriage)(String(rawText), pageUrl ? String(pageUrl) : undefined);
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        createdAtIso: now,
    });
    res.status(201).json({ success: true, id: ref.id, analysis });
});
api.post("/v1/org/invite", auth_1.requireAuth, async (req, res) => {
    const { email, role, orgName, organizationId } = req.body ?? {};
    if (!email || typeof email !== "string") {
        res.status(400).json({ error: "email が必要です" });
        return;
    }
    try {
        const result = await (0, invite_1.inviteOrgMember)({
            inviterUid: req.uid,
            inviterEmail: req.email,
            email: String(email),
            role: typeof role === "string" ? role : "member",
            orgName: typeof orgName === "string" ? orgName : undefined,
            organizationId: typeof organizationId === "string" ? organizationId : undefined,
        });
        res.json({ ok: true, emailSent: result.emailSent, inviteUrl: result.inviteUrl });
    }
    catch (err) {
        const status = err.status ?? 500;
        const message = err instanceof Error ? err.message : "invite failed";
        res.status(status).json({ error: message });
    }
});
api.get("/v1/org/invite/:token", async (req, res) => {
    try {
        const result = await (0, invite_1.getInvitePublic)(String(req.params.token));
        res.json(result);
    }
    catch (err) {
        const status = err.status ?? 500;
        const message = err instanceof Error ? err.message : "invite lookup failed";
        res.status(status).json({ error: message });
    }
});
api.post("/v1/org/invite/:token/accept", auth_1.requireAuth, async (req, res) => {
    try {
        const result = await (0, invite_1.acceptInvite)({
            token: String(req.params.token),
            uid: req.uid,
            email: req.email,
            name: typeof req.body?.name === "string" ? req.body.name : undefined,
        });
        res.json({ ok: true, organizationId: result.organizationId });
    }
    catch (err) {
        const status = err.status ?? 500;
        const message = err instanceof Error ? err.message : "accept failed";
        res.status(status).json({ error: message });
    }
});
api.post("/v1/org/weekly-digest/publish", auth_1.requireAuth, async (req, res) => {
    try {
        const orgId = await (0, invite_1.assertOrgAdmin)(req.uid, req.email, req.body?.organizationId);
        const force = Boolean(req.body?.force);
        const result = await (0, weeklyDigest_1.publishWeeklyDigestForOrg)(orgId, { force });
        res.json(result);
    }
    catch (err) {
        const status = err.status ?? 500;
        const message = err instanceof Error ? err.message : "weekly digest failed";
        res.status(status).json({ error: message });
    }
});
api.post("/v1/org/weekly-digest/ensure", auth_1.requireAuth, async (req, res) => {
    try {
        const orgId = await (0, invite_1.resolveOrgId)(req.uid, req.email);
        const result = await (0, weeklyDigest_1.publishWeeklyDigestForOrg)(orgId);
        res.json(result);
    }
    catch (err) {
        const status = err.status ?? 403;
        const message = err instanceof Error ? err.message : "weekly digest ensure failed";
        res.status(status).json({ error: message });
    }
});
api.get("/v1/org/weekly-digest/preview", auth_1.requireAuth, async (req, res) => {
    try {
        const orgId = await (0, invite_1.resolveOrgId)(req.uid, req.email);
        const digest = await (0, weeklyDigest_1.buildWeeklyResponseDigest)(orgId);
        res.json({ digest });
    }
    catch (err) {
        const status = err.status ?? 403;
        const message = err instanceof Error ? err.message : "preview failed";
        res.status(status).json({ error: message });
    }
});
api.get("/v1/public/health", (_req, res) => {
    res.json({ ok: true, public: true });
});
app.use("/api", api);
app.use("/", api);
exports.shapeitApi = (0, https_1.onRequest)({
    region: "asia-northeast1",
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: [...secrets_1.functionSecrets],
}, app);
/** 毎週月曜 9:00 JST（UTC 0:00）に全 org へ週次サマリーを配信 */
exports.shapeitWeeklyDigest = (0, scheduler_1.onSchedule)({
    schedule: "0 9 * * 1",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
    memory: "512MiB",
    timeoutSeconds: 300,
    secrets: [...secrets_1.functionSecrets],
}, async () => {
    const result = await (0, weeklyDigest_1.publishWeeklyDigestForAllOrgs)();
    console.info("shapeit weekly digest complete", result);
});
