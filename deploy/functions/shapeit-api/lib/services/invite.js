"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOrgId = resolveOrgId;
exports.assertOrgAdmin = assertOrgAdmin;
exports.inviteOrgMember = inviteOrgMember;
exports.getInvitePublic = getInvitePublic;
exports.acceptInvite = acceptInvite;
const node_crypto_1 = require("node:crypto");
const firestore_1 = require("firebase-admin/firestore");
const mail_1 = require("./mail");
const LEGACY_ORG_ID = process.env.SHAPEIT_DEFAULT_ORG_ID ?? "org_shigotoku";
const PLATFORM_ADMINS = new Set(["meditoku.jp@gmail.com", "admin@shigotoku.com"]);
function appUrl() {
    return (process.env.SHAPEIT_APP_URL ?? "https://app.shapeit.shigotoku.com").replace(/\/$/, "");
}
function randomToken() {
    return (0, node_crypto_1.randomBytes)(16).toString("hex");
}
function emailKey(email) {
    return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
}
async function resolveOrgId(uid, email) {
    const db = (0, firestore_1.getFirestore)();
    const userSnap = await db.collection("shapeit_users").doc(uid).get();
    if (userSnap.exists && userSnap.data()?.organizationId) {
        return String(userSnap.data().organizationId);
    }
    const legacy = await db.collection("shapeit_organizations").doc(LEGACY_ORG_ID).collection("members").doc(uid).get();
    if (legacy.exists)
        return LEGACY_ORG_ID;
    if (email && PLATFORM_ADMINS.has(email))
        return LEGACY_ORG_ID;
    throw Object.assign(new Error("組織に所属していません"), { status: 403 });
}
async function assertOrgAdmin(uid, email, orgId) {
    const resolved = orgId || (await resolveOrgId(uid, email));
    if (email && PLATFORM_ADMINS.has(email))
        return resolved;
    const snap = await (0, firestore_1.getFirestore)()
        .collection("shapeit_organizations")
        .doc(resolved)
        .collection("members")
        .doc(uid)
        .get();
    const role = String(snap.data()?.role ?? "");
    if (!["admin", "owner"].includes(role)) {
        throw Object.assign(new Error("組織の管理者のみ招待できます"), { status: 403 });
    }
    return resolved;
}
async function inviteOrgMember(input) {
    const orgId = await assertOrgAdmin(input.inviterUid, input.inviterEmail, input.organizationId);
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) {
        throw Object.assign(new Error("メールアドレスが不正です"), { status: 400 });
    }
    const role = input.role ?? "member";
    const db = (0, firestore_1.getFirestore)();
    const inviteId = emailKey(email);
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    const orgSnap = await db.collection("shapeit_organizations").doc(orgId).get();
    const orgLabel = input.orgName?.trim() || String(orgSnap.data()?.name ?? "ShapeIt");
    const inviteUrl = `${appUrl()}/invite/${token}`;
    await db.collection("shapeit_organizations").doc(orgId).collection("invites").doc(inviteId).set({
        email,
        role,
        token,
        invitedAtIso: new Date().toISOString(),
        invitedAt: firestore_1.FieldValue.serverTimestamp(),
        invitedBy: input.inviterUid,
        expiresAt,
    });
    await db.collection("shapeit_invitations").doc(token).set({
        organizationId: orgId,
        email,
        role,
        orgName: orgLabel,
        createdBy: input.inviterUid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        acceptedAt: null,
        expiresAt,
    });
    const subject = `[${orgLabel}] ShapeIt への招待`;
    const html = `
    <p>${orgLabel} の管理者が ShapeIt にあなたを招待しました。</p>
    <p>次のリンクから <strong>パスワードを設定</strong>して、会社のワークスペースに参加してください。</p>
    <p><a href="${inviteUrl}">招待を承認して参加する</a></p>
    <p style="color:#666;font-size:12px">リンクの有効期限は7日です。届かない場合は管理者に連絡してください。</p>
  `;
    let emailSent = false;
    if ((0, mail_1.isMailConfigured)()) {
        try {
            await (0, mail_1.sendTransactionalEmail)({ to: email, subject, html });
            emailSent = true;
        }
        catch (err) {
            console.error("shapeit invite mail failed", err);
        }
    }
    return { emailSent, inviteUrl };
}
async function getInvitePublic(token) {
    const snap = await (0, firestore_1.getFirestore)().collection("shapeit_invitations").doc(token).get();
    if (!snap.exists) {
        throw Object.assign(new Error("招待が見つかりません"), { status: 404 });
    }
    const data = snap.data();
    const expiresAt = data.expiresAt?.toDate?.();
    const expired = Boolean(data.acceptedAt) || Boolean(expiresAt && expiresAt.getTime() < Date.now());
    return {
        email: String(data.email ?? ""),
        orgName: String(data.orgName ?? "ShapeIt"),
        organizationId: String(data.organizationId ?? ""),
        expired,
    };
}
async function acceptInvite(input) {
    const db = (0, firestore_1.getFirestore)();
    const snap = await db.collection("shapeit_invitations").doc(input.token).get();
    if (!snap.exists) {
        throw Object.assign(new Error("招待リンクが無効です"), { status: 404 });
    }
    const data = snap.data();
    if (data.acceptedAt) {
        return { organizationId: String(data.organizationId) };
    }
    const expiresAt = data.expiresAt?.toDate?.();
    if (expiresAt && expiresAt.getTime() < Date.now()) {
        throw Object.assign(new Error("招待の有効期限が切れています"), { status: 410 });
    }
    const invitedEmail = String(data.email ?? "").toLowerCase();
    const userEmail = (input.email ?? "").trim().toLowerCase();
    if (!userEmail || userEmail !== invitedEmail) {
        throw Object.assign(new Error(`この招待は ${invitedEmail} 向けです。同じメールアドレスでログインしてください。`), {
            status: 403,
        });
    }
    const orgId = String(data.organizationId);
    const role = String(data.role ?? "member");
    const name = input.name?.trim() || userEmail.split("@")[0];
    const existingUser = await db.collection("shapeit_users").doc(input.uid).get();
    const currentOrg = existingUser.data()?.organizationId;
    if (currentOrg && currentOrg !== orgId) {
        throw Object.assign(new Error("すでに別の組織に所属しています。別のメールアドレスで参加してください。"), {
            status: 409,
        });
    }
    await db.collection("shapeit_organizations").doc(orgId).collection("members").doc(input.uid).set({
        role,
        email: userEmail,
        name,
        joinedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await db.collection("shapeit_users").doc(input.uid).set({
        organizationId: orgId,
        email: userEmail,
        name,
        role,
        lastLoginAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    await db.collection("shapeit_invitations").doc(input.token).update({
        acceptedAt: firestore_1.FieldValue.serverTimestamp(),
        acceptedBy: input.uid,
    });
    const inviteId = emailKey(userEmail);
    await db
        .collection("shapeit_organizations")
        .doc(orgId)
        .collection("invites")
        .doc(inviteId)
        .set({ acceptedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    return { organizationId: orgId };
}
