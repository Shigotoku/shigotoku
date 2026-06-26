import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { assertManualAccess } from './manuals.js';
import { sendShareConfirmationEmail } from './transactionEmail.js';

async function resolveNotifyEmails(orgId: string, requested: string[]): Promise<string[]> {
  const normalized = requested.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (normalized.length > 0) return [...new Set(normalized)];

  const db = getFirestore();
  const members = await db.collection('clipit_organizations').doc(orgId).collection('members').get();
  return members.docs
    .filter((d) => {
      const role = d.data().role as string;
      return role === 'owner' || role === 'admin' || role === 'editor' || role === 'viewer';
    })
    .map((d) => String(d.data().email ?? '').trim().toLowerCase())
    .filter(Boolean);
}

export async function notifyManualShare(
  manualId: string,
  uid: string,
  input: { shareUrl: string; emails?: string[]; message?: string },
): Promise<{ sent: boolean; recipients: number }> {
  const { orgId, manual } = await assertManualAccess(manualId, uid);
  const db = getFirestore();
  const orgSnap = await db.collection('clipit_organizations').doc(orgId).get();
  const orgName = String(orgSnap.data()?.name ?? '組織');
  const title = String(manual.title ?? 'マニュアル');

  const to = await resolveNotifyEmails(orgId, input.emails ?? []);
  if (to.length === 0) {
    throw Object.assign(new Error('送信先メールアドレスがありません'), { status: 400 });
  }

  const sent = await sendShareConfirmationEmail(to, {
    orgName,
    manualTitle: title,
    shareUrl: input.shareUrl,
    message: input.message?.trim(),
  });

  if (sent) {
    await db.collection('clipit_notifications').add({
      organizationId: orgId,
      type: 'share_request',
      manualId,
      message: `「${title}」の確認依頼メールを ${to.length} 件送信しました`,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return { sent, recipients: to.length };
}
