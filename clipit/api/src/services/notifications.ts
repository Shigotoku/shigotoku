import { getFirestore } from 'firebase-admin/firestore';

async function assertOrgMember(orgId: string, uid: string) {
  const member = await getFirestore()
    .collection('clipit_organizations')
    .doc(orgId)
    .collection('members')
    .doc(uid)
    .get();
  if (!member.exists) {
    const err = new Error('組織へのアクセスがありません') as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

export async function listOrgNotifications(orgId: string, uid: string) {
  await assertOrgMember(orgId, uid);
  const snap = await getFirestore()
    .collection('clipit_notifications')
    .where('organizationId', '==', orgId)
    .limit(40)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown> & { id: string }))
    .sort((a, b) => {
      const ta = (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
      const tb = (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
      return tb - ta;
    })
    .slice(0, 20);
}
