import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const MS_180_DAYS = 180 * 86_400_000;

export async function processExpiryNotifications(): Promise<{ notified: number; scanned: number }> {
  const db = getFirestore();
  const now = Date.now();
  const snap = await db.collection('clipit_manuals').where('status', 'in', ['draft', 'published']).limit(500).get();

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
  }

  return { notified, scanned: snap.size };
}
