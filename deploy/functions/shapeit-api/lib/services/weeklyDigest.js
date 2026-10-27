"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWeeklyResponseDigest = buildWeeklyResponseDigest;
exports.postSlackWeeklyDigest = postSlackWeeklyDigest;
exports.postOutboundWebhook = postOutboundWebhook;
exports.publishWeeklyDigestForOrg = publishWeeklyDigestForOrg;
exports.publishWeeklyDigestForAllOrgs = publishWeeklyDigestForAllOrgs;
exports.getWeekKey = getWeekKey;
const firestore_1 = require("firebase-admin/firestore");
const APP_URL = (process.env.SHAPEIT_APP_URL ?? "https://app.shapeit.shigotoku.com").replace(/\/$/, "");
const WEEK_MS = 7 * 86_400_000;
const SEV = { S0: 4, S1: 3, S2: 2, S3: 1 };
function canonicalizePageKey(url) {
    if (!url)
        return "";
    try {
        const u = new URL(String(url));
        return `${u.origin}${u.pathname.replace(/\/$/, "") || "/"}`;
    }
    catch {
        return String(url).split("?")[0] ?? "";
    }
}
function encodePackId(key) {
    return Buffer.from(key, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
function buildFixPackTop3(issues, feedback) {
    const byId = new Map(feedback.map((f) => [f.id, f]));
    const groups = new Map();
    for (const issue of issues) {
        if (issue.status === "done" || issue.status === "archived")
            continue;
        const ids = Array.isArray(issue.feedbackIds) ? issue.feedbackIds : [];
        const linked = ids.map((id) => byId.get(id)).filter(Boolean);
        const url = linked.find((f) => f.pageUrl)?.pageUrl;
        const key = canonicalizePageKey(url ? String(url) : "");
        if (!key)
            continue;
        const entry = groups.get(key) ?? { issues: [], reportCount: 0, maxSeverity: "S3" };
        entry.issues.push(issue);
        entry.reportCount += linked.length || 1;
        const sev = String(issue.severity ?? "S3");
        if ((SEV[sev] ?? 1) > (SEV[entry.maxSeverity] ?? 1))
            entry.maxSeverity = sev;
        groups.set(key, entry);
    }
    return Array.from(groups.entries())
        .map(([pageKey, g]) => ({
        label: pageKey.replace(/^https?:\/\//, ""),
        pageKey,
        urgencyScore: g.reportCount * (SEV[g.maxSeverity] || 1),
        openIssueCount: g.issues.length,
        reportCount: g.reportCount,
    }))
        .sort((a, b) => b.urgencyScore - a.urgencyScore)
        .slice(0, 3);
}
function getWeekKey(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 +
        Math.round(((d.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
function formatJaDate(iso) {
    try {
        return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
    }
    catch {
        return iso;
    }
}
function isoOf(value, fallback = new Date().toISOString()) {
    if (typeof value === "string" && value)
        return value;
    const ts = value;
    if (ts?.toDate)
        return ts.toDate().toISOString();
    return fallback;
}
async function buildWeeklyResponseDigest(orgId) {
    const db = (0, firestore_1.getFirestore)();
    const now = Date.now();
    const weekEnd = new Date(now);
    const weekStart = new Date(now - WEEK_MS);
    const weekKey = getWeekKey(weekEnd);
    const periodLabel = `${formatJaDate(weekStart.toISOString())} – ${formatJaDate(weekEnd.toISOString())}`;
    const inWeek = (iso) => {
        const t = new Date(iso).getTime();
        return t >= weekStart.getTime() && t <= weekEnd.getTime();
    };
    const [fbSnap, issueSnap, clSnap] = await Promise.all([
        db.collection("shapeit_feedback").where("organizationId", "==", orgId).get(),
        db.collection("shapeit_issues").where("organizationId", "==", orgId).get(),
        db.collection("shapeit_changelog").where("organizationId", "==", orgId).get(),
    ]);
    const feedback = fbSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const issues = issueSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const changelog = clSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    const fixPackTop3 = buildFixPackTop3(issues, feedback);
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
        fixPackTop3,
    };
}
async function postSlackWeeklyDigest(webhookUrl, digest) {
    const completedLines = digest.completedItems.length === 0
        ? ["今週の完了はまだありません"]
        : digest.completedItems.slice(0, 8).map((c) => `• ${c.title}`);
    const fixPackLines = digest.fixPackTop3.length === 0
        ? []
        : digest.fixPackTop3.map((p, i) => `${i + 1}. *${p.label}* — 報告 ${p.reportCount}件 · Issue ${p.openIssueCount}件（緊急度 ${p.urgencyScore}）`);
    const blocks = [
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
    ];
    if (fixPackLines.length > 0) {
        blocks.push({
            type: "section",
            text: { type: "mrkdwn", text: "*修正パック Top3*\n" + fixPackLines.join("\n") },
        });
        blocks.push({
            type: "actions",
            elements: digest.fixPackTop3.slice(0, 3).map((p) => ({
                type: "button",
                text: { type: "plain_text", text: p.label.slice(0, 20), emoji: true },
                url: `${APP_URL}/fix-packs/${encodePackId(p.pageKey)}`,
            })),
        });
    }
    blocks.push({
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
    });
    const payload = {
        text: `今週の改善サマリー: 完了 ${digest.completedCount}件 · 新規 ${digest.newFeedbackCount}件`,
        blocks,
    };
    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return res.ok;
    }
    catch (err) {
        console.warn("shapeit weekly digest slack error", err);
        return false;
    }
}
async function postOutboundWebhook(url, secret, event, payload) {
    const body = JSON.stringify({ event, at: new Date().toISOString(), payload });
    const headers = {
        "Content-Type": "application/json",
        "X-ShapeIt-Event": event,
    };
    if (secret) {
        const { createHmac } = await Promise.resolve().then(() => __importStar(require("node:crypto")));
        headers["X-ShapeIt-Signature"] = createHmac("sha256", secret).update(body).digest("hex");
    }
    try {
        const res = await fetch(url, { method: "POST", headers, body });
        return res.ok;
    }
    catch (err) {
        console.warn("shapeit weekly digest webhook error", err);
        return false;
    }
}
async function publishWeeklyDigestForOrg(orgId, options) {
    const db = (0, firestore_1.getFirestore)();
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
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
                createdAt: firestore_1.FieldValue.serverTimestamp(),
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
    const webhookEvents = org.outboundWebhookEvents ?? {};
    if (webhookEnabled &&
        webhookUrl.startsWith("https://") &&
        (webhookEvents.weekly_digest ?? true)) {
        webhookSent = await postOutboundWebhook(webhookUrl, String(org.outboundWebhookSecret ?? ""), "weekly_digest", { organizationId: orgId, weekKey: digest.weekKey, digest });
    }
    await orgRef.set({
        lastWeeklyDigestWeekKey: digest.weekKey,
        lastWeeklyDigestAt: firestore_1.FieldValue.serverTimestamp(),
        lastWeeklyDigestAtIso: now,
        lastWeeklyDigestSlackSent: slackSent,
    }, { merge: true });
    return {
        published: true,
        weekKey: digest.weekKey,
        slackSent,
        webhookSent,
        memberCount: memberUids.length,
    };
}
async function publishWeeklyDigestForAllOrgs() {
    const db = (0, firestore_1.getFirestore)();
    const snap = await db.collection("shapeit_organizations").get();
    let published = 0;
    for (const doc of snap.docs) {
        try {
            const result = await publishWeeklyDigestForOrg(doc.id);
            if (result.published)
                published += 1;
        }
        catch (err) {
            console.warn("shapeit weekly digest org failed", doc.id, err);
        }
    }
    return { orgs: snap.size, published };
}
