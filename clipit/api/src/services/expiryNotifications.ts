import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendExpiryDigestEmail } from './expiryEmail.js';

const MS_180_DAYS = 180 * 86_400_000;

type PendingItem = { manualId: string; title: string; message: string; reason: 'expired' | 'stale' };

async function resolveNotifyEmails(orgId: string, orgData: Record<string, unknown>): Promise<string[]> {
  const configured = (orgData.notifyEmails as string[] | undefined)?.filter(Boolean) ?? [];
  if (configured.length > 0) return configured;

  const db = getFirestore();
  const members = await db.collection('clipit_organizations').doc(orgId).collection('members').get();
  return members.docs
    .filter((d) => {
      const role = d.data().role as string;
      return role === 'owner' || role === 'admin';
    })
    .map((d) => String(d.data().email ?? '').trim().toLowerCase())
    .filter(Boolean);
}

export async function processExpiryNotifications(): Promise<{ notified: number; scanned: number; emails: number }> {
  const db = getFirestore();
  const now = Date.now();
  const snap = await db.collection('clipit_manuals').where('status', 'in', ['draft', 'published']).limit(500).get();

  const pendingByOrg = new Map<string, PendingItem[]>();
  let notified = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const orgId = data.organizationId as string | undefined;
    if (!orgId) continue;

    const expiresAt = data.expiresAt as Timestamp | undefined;
    const updatedAt = data.updatedAt as Timestamp | undefined;
    const expiryNotifiedAt = data.expiryNotifiedAt as Timestamp | undefined;

    let reason: 'expired' | 'stale' | null = null;
    if (expiresAt && expiresAt.toMillis() <= now) {
      reason = 'expired';
    } else if (updatedAt && now - updatedAt.toMillis() > MS_180_DAYS) {
      reason = 'stale';
    }
    if (!reason) continue;

    if (expiryNotifiedAt) {
      const daysSinceNotify = (now - expiryNotifiedAt.toMillis()) / 86_400_000;
      if (daysSinceNotify < 30) continue;
    }

    const title = (data.title as string) || '無題のマニュアル';
    const message =
      reason === 'expired'
        ? `「${title}」の賞味期限（180日）を過ぎました。内容を見直してください。`
        : `「${title}」は180日以上更新されていません。まとめて修正で見直しを。`;

    await db.collection('clipit_notifications').add({
      organizationId: orgId,
      type: 'expiry',
      manualId: doc.id,
      message,
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });

    await doc.ref.update({ expiryNotifiedAt: FieldValue.serverTimestamp() });
    notified += 1;

    const list = pendingByOrg.get(orgId) ?? [];
    list.push({ manualId: doc.id, title, message, reason });
    pendingByOrg.set(orgId, list);
  }

  let emails = 0;
  for (const [orgId, items] of pendingByOrg) {
    const orgSnap = await db.collection('clipit_organizations').doc(orgId).get();
    if (!orgSnap.exists) continue;
    const orgData = orgSnap.data()!;
    const to = await resolveNotifyEmails(orgId, orgData);
    const orgName = String(orgData.name ?? '組織');
    const sent = await sendExpiryDigestEmail(to, orgName, items);
    if (sent) emails += 1;
  }

  return { notified, scanned: snap.size, emails };
}
