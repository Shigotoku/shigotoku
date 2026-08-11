import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { sendTransactionalEmail } from "./mail";

const ORG_ID = process.env.SHAPEIT_DEFAULT_ORG_ID ?? "org_shigotoku";

function appUrl(): string {
  return (process.env.SHAPEIT_APP_URL ?? "https://app.shapeit.shigotoku.com").replace(/\/$/, "");
}

const PLATFORM_ADMINS = new Set(["meditoku.jp@gmail.com", "admin@shigotoku.com"]);

export async function assertOrgAdmin(uid: string, email?: string): Promise<void> {
  if (email && PLATFORM_ADMINS.has(email)) return;
  const snap = await getFirestore()
    .collection("shapeit_organizations")
    .doc(ORG_ID)
    .collection("members")
    .doc(uid)
    .get();
  const role = String(snap.data()?.role ?? "");
  if (!["admin", "owner"].includes(role)) {
    throw Object.assign(new Error("組織の管理者のみ招待できます"), { status: 403 });
  }
}

export async function inviteOrgMember(input: {
  inviterUid: string;
  inviterEmail?: string;
  email: string;
  role?: string;
  orgName?: string;
}): Promise<{ emailSent: boolean }> {
  await assertOrgAdmin(input.inviterUid, input.inviterEmail);

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    throw Object.assign(new Error("メールアドレスが不正です"), { status: 400 });
  }
  const role = input.role ?? "member";
  const db = getFirestore();
  const inviteId = email.replace(/[^a-z0-9@._-]/g, "_");

  await db
    .collection("shapeit_organizations")
    .doc(ORG_ID)
    .collection("invites")
    .doc(inviteId)
    .set({
      email,
      role,
      invitedAtIso: new Date().toISOString(),
      invitedAt: FieldValue.serverTimestamp(),
      invitedBy: input.inviterUid,
    });

  const auth = getAuth();
  try {
    await auth.getUserByEmail(email);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "auth/user-not-found") {
      await auth.createUser({ email, emailVerified: false });
    } else {
      throw err;
    }
  }

  const setupLink = await auth.generatePasswordResetLink(email, {
    url: `${appUrl()}/login`,
    handleCodeInApp: false,
  });

  const orgLabel = input.orgName?.trim() || "ShapeIt";
  const subject = `[${orgLabel}] ShapeIt への招待`;
  const html = `
    <p>${orgLabel} の管理者が ShapeIt にあなたを招待しました。</p>
    <p>次のリンクから <strong>メールアドレス（ID）とパスワード</strong> を設定してログインしてください。</p>
    <p><a href="${setupLink}">アカウントを設定して参加する</a></p>
    <p>ログイン画面: <a href="${appUrl()}/login">${appUrl()}/login</a></p>
    <p style="color:#666;font-size:12px">リンクの有効期限があります。届かない場合は管理者に連絡してください。</p>
  `;

  let emailSent = false;
  try {
    await sendTransactionalEmail({ to: email, subject, html });
    emailSent = true;
  } catch (err) {
    console.error("shapeit invite mail failed", err);
    throw Object.assign(
      new Error(
        err instanceof Error
          ? err.message
          : "招待メールの送信に失敗しました。SMTP 設定を確認してください。",
      ),
      { status: 502 },
    );
  }

  return { emailSent };
}
