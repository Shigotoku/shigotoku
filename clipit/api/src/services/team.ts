import { getFirestore, FieldValue } from 'firebase-admin/firestore';

type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
type MemberDoc = { role?: MemberRole; email?: string; name?: string };

async function getMember(orgId: string, uid: string) {
  const ref = getFirestore().collection('clipit_organizations').doc(orgId).collection('members').doc(uid);
  const snap = await ref.get();
  return { ref, snap, data: snap.data() as MemberDoc | undefined };
}

async function assertOrgAdmin(orgId: string, uid: string) {
  const { snap, data } = await getMember(orgId, uid);
  if (!snap.exists || !data) {
    throw Object.assign(new Error('組織へのアクセスがありません'), { status: 403 });
  }
  if (data.role !== 'owner' && data.role !== 'admin') {
    throw Object.assign(new Error('管理者権限が必要です'), { status: 403 });
  }
  return data;
}

export async function updateMemberRole(orgId: string, actorUid: string, memberUid: string, role: MemberRole) {
  await assertOrgAdmin(orgId, actorUid);
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    throw Object.assign(new Error('オーナーへの変更はサポートしていません'), { status: 400 });
  }

  const { snap, data } = await getMember(orgId, memberUid);
  if (!snap.exists || !data) {
    throw Object.assign(new Error('メンバーが見つかりません'), { status: 404 });
  }
  if (data.role === 'owner') {
    throw Object.assign(new Error('オーナーの権限は変更できません'), { status: 400 });
  }

  const db = getFirestore();
  await snap.ref.update({ role, updatedAt: FieldValue.serverTimestamp() });
  await db.collection('clipit_users').doc(memberUid).set({ role }, { merge: true });
  return { ok: true };
}

export async function removeMember(orgId: string, actorUid: string, memberUid: string) {
  await assertOrgAdmin(orgId, actorUid);
  if (actorUid === memberUid) {
    throw Object.assign(new Error('自分自身は削除できません'), { status: 400 });
  }

  const { snap, data } = await getMember(orgId, memberUid);
  if (!snap.exists || !data) {
    throw Object.assign(new Error('メンバーが見つかりません'), { status: 404 });
  }
  if (data.role === 'owner') {
    throw Object.assign(new Error('オーナーは削除できません'), { status: 400 });
  }

  const db = getFirestore();
  await snap.ref.delete();
  const userRef = db.collection('clipit_users').doc(memberUid);
  const userSnap = await userRef.get();
  if (userSnap.exists && userSnap.data()?.organizationId === orgId) {
    await userRef.update({
      organizationId: FieldValue.delete(),
      role: FieldValue.delete(),
    });
  }
  return { ok: true };
}
