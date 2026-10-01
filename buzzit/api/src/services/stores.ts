import { randomBytes } from 'crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { PlanTier, UserSettings } from './firestore';
import { getUserSettings } from './firestore';
import { canAddStaff, canAddStore } from './billing';

export type StoreRole = 'owner' | 'manager' | 'staff';

export interface StoreRecord {
  id: string;
  name: string;
  ownerId: string;
  /** 課金主体アカウント */
  accountId?: string;
  industry?: string;
  createdAt: string;
}

export interface StoreMemberRecord {
  userId: string;
  role: StoreRole;
  email?: string;
  displayName?: string;
  createdAt: string;
}

export interface StoreInvitationRecord {
  id: string;
  storeId: string;
  email: string;
  role: Exclude<StoreRole, 'owner'>;
  token: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

function db() {
  return getFirestore();
}

function storesCol() {
  return db().collection('stores');
}

function invitationTokensCol() {
  return db().collection('buzzit_invitation_tokens');
}

export async function ensureDefaultStore(
  uid: string,
  displayName?: string,
): Promise<StoreRecord> {
  const userRef = db().collection('users').doc(uid);
  const userSnap = await userRef.get();
  const data = userSnap.data() ?? {};
  const storeIds: string[] = data.storeIds ?? [];

  if (storeIds.length > 0) {
    const existing = await storesCol().doc(storeIds[0]).get();
    if (existing.exists) {
      return { id: existing.id, ...(existing.data() as Omit<StoreRecord, 'id'>) };
    }
  }

  const accountId = data.accountId as string | undefined;
  const storeRef = storesCol().doc();
  const storeName = displayName ? `${displayName}の店舗` : 'マイ店舗';
  const store: Omit<StoreRecord, 'id'> = {
    name: storeName,
    ownerId: uid,
    ...(accountId ? { accountId } : {}),
    industry: 'salon',
    createdAt: new Date().toISOString(),
  };

  const batch = db().batch();
  batch.set(storeRef, store);
  batch.set(storeRef.collection('members').doc(uid), {
    userId: uid,
    role: 'owner',
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(userRef, {
    storeIds: FieldValue.arrayUnion(storeRef.id),
    activeStoreId: storeRef.id,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();

  return { id: storeRef.id, ...store };
}

export async function listStoresForUser(
  uid: string,
  preloadedSettings?: UserSettings,
): Promise<StoreRecord[]> {
  const settings = preloadedSettings ?? (await getUserSettings(uid));
  const storeIds: string[] = settings.storeIds ?? [];

  if (!storeIds.length) {
    const created = await ensureDefaultStore(uid, settings.displayName);
    return [created];
  }

  const stores = await Promise.all(
    storeIds.map(async (id) => {
      const snap = await storesCol().doc(id).get();
      if (!snap.exists) return null;
      return { id: snap.id, ...(snap.data() as Omit<StoreRecord, 'id'>) };
    }),
  );
  return stores.filter(Boolean) as StoreRecord[];
}

export async function getUserRoleInStore(storeId: string, uid: string): Promise<StoreRole | null> {
  const snap = await storesCol().doc(storeId).collection('members').doc(uid).get();
  if (!snap.exists) return null;
  return snap.data()?.role as StoreRole;
}

export async function listStoreMembers(storeId: string): Promise<StoreMemberRecord[]> {
  const snap = await storesCol().doc(storeId).collection('members').get();
  return snap.docs.map((d) => ({
    userId: d.id,
    ...(d.data() as Omit<StoreMemberRecord, 'userId'>),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? d.data().createdAt ?? '',
  }));
}

export async function countPendingInvites(storeId: string): Promise<number> {
  const snap = await storesCol().doc(storeId).collection('invitations').get();
  return snap.docs.filter((d) => !d.data().acceptedAt).length;
}

export async function createStore(
  uid: string,
  name: string,
  industry?: string,
): Promise<StoreRecord> {
  const settings = await getUserSettings(uid);
  const plan = settings.plan as PlanTier;
  const stores = await listStoresForUser(uid);

  if (!canAddStore(plan, stores.length)) {
    throw new Error(`${plan} プランではこれ以上店舗を追加できません。プランをアップグレードしてください。`);
  }

  const storeRef = storesCol().doc();
  const store: Omit<StoreRecord, 'id'> = {
    name,
    ownerId: uid,
    ...(settings.accountId ? { accountId: settings.accountId } : {}),
    industry: industry ?? settings.industry ?? 'salon',
    createdAt: new Date().toISOString(),
  };

  const batch = db().batch();
  batch.set(storeRef, store);
  batch.set(storeRef.collection('members').doc(uid), {
    userId: uid,
    role: 'owner',
    email: settings.email,
    displayName: settings.displayName,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db().collection('users').doc(uid), {
    storeIds: FieldValue.arrayUnion(storeRef.id),
    activeStoreId: storeRef.id,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();

  return { id: storeRef.id, ...store };
}

export async function setActiveStore(uid: string, storeId: string): Promise<void> {
  const role = await getUserRoleInStore(storeId, uid);
  if (!role) throw new Error('この店舗へのアクセス権がありません');
  await db().collection('users').doc(uid).set(
    { activeStoreId: storeId, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

async function getStoreOwnerPlan(storeId: string): Promise<PlanTier> {
  const storeSnap = await storesCol().doc(storeId).get();
  const ownerId = storeSnap.data()?.ownerId as string;
  const ownerSettings = await getUserSettings(ownerId);
  return ownerSettings.plan as PlanTier;
}

export async function createStoreInvitation(params: {
  storeId: string;
  invitedBy: string;
  email: string;
  role: Exclude<StoreRole, 'owner'>;
}): Promise<{ token: string; inviteUrl: string }> {
  const plan = await getStoreOwnerPlan(params.storeId);
  const actorRole = await getUserRoleInStore(params.storeId, params.invitedBy);

  if (actorRole !== 'owner' && actorRole !== 'manager') {
    throw new Error('メンバー招待の権限がありません');
  }

  const [members, pending] = await Promise.all([
    listStoreMembers(params.storeId),
    countPendingInvites(params.storeId),
  ]);

  if (!canAddStaff(plan, members.length, pending)) {
    throw new Error(`現在のプラン（${plan}）ではメンバー上限に達しています。プランをアップグレードしてください。`);
  }

  const existing = await storesCol()
    .doc(params.storeId)
    .collection('invitations')
    .where('email', '==', params.email.toLowerCase())
    .get();

  const duplicate = existing.docs.find((d) => !d.data().acceptedAt);
  if (duplicate) throw new Error('このメールアドレスには既に招待を送信しています');

  const token = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const storeSnap = await storesCol().doc(params.storeId).get();
  const storeName = storeSnap.data()?.name ?? '店舗';

  const invRef = storesCol().doc(params.storeId).collection('invitations').doc();
  const batch = db().batch();
  batch.set(invRef, {
    storeId: params.storeId,
    email: params.email.toLowerCase(),
    role: params.role,
    token,
    invitedBy: params.invitedBy,
    expiresAt,
    acceptedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(invitationTokensCol().doc(token), {
    storeId: params.storeId,
    invitationId: invRef.id,
    storeName,
    role: params.role,
    expiresAt,
    acceptedAt: null,
  });
  await batch.commit();

  const appOrigin = process.env.BUZZIT_APP_ORIGIN ?? 'https://shigotoku-buzzit-app.web.app';
  return { token, inviteUrl: `${appOrigin}/invite/${token}` };
}

export async function listStoreInvitations(storeId: string): Promise<StoreInvitationRecord[]> {
  const snap = await storesCol().doc(storeId).collection('invitations').orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<StoreInvitationRecord, 'id'>),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? '',
  }));
}

export async function revokeStoreInvitation(
  storeId: string,
  invitationId: string,
  token?: string,
): Promise<void> {
  const batch = db().batch();
  batch.delete(storesCol().doc(storeId).collection('invitations').doc(invitationId));
  if (token) batch.delete(invitationTokensCol().doc(token));
  await batch.commit();
}

export async function removeStoreMember(
  storeId: string,
  targetUserId: string,
  actorUserId: string,
): Promise<void> {
  const actorRole = await getUserRoleInStore(storeId, actorUserId);
  const targetRole = await getUserRoleInStore(storeId, targetUserId);

  if (!actorRole || !targetRole) throw new Error('メンバーが見つかりません');
  if (targetRole === 'owner') throw new Error('オーナーは削除できません');
  if (actorUserId === targetUserId) throw new Error('自分自身は削除できません');
  if (actorRole !== 'owner' && actorRole !== 'manager') {
    throw new Error('メンバー削除の権限がありません');
  }

  const batch = db().batch();
  batch.delete(storesCol().doc(storeId).collection('members').doc(targetUserId));
  batch.set(db().collection('users').doc(targetUserId), {
    storeIds: FieldValue.arrayRemove(storeId),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}

export async function updateStoreMemberRole(
  storeId: string,
  targetUserId: string,
  role: Exclude<StoreRole, 'owner'>,
  actorUserId: string,
): Promise<void> {
  const actorRole = await getUserRoleInStore(storeId, actorUserId);
  const targetRole = await getUserRoleInStore(storeId, targetUserId);

  if (targetRole === 'owner') throw new Error('オーナーのロールは変更できません');
  if (actorRole !== 'owner' && actorRole !== 'manager') {
    throw new Error('ロール変更の権限がありません');
  }
  if (actorRole === 'manager' && role === 'manager') {
    throw new Error('管理者の任命はオーナーのみ可能です');
  }

  await storesCol().doc(storeId).collection('members').doc(targetUserId).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function transferStoreOwnership(
  storeId: string,
  currentOwnerId: string,
  newOwnerId: string,
): Promise<void> {
  const batch = db().batch();
  batch.update(storesCol().doc(storeId), { ownerId: newOwnerId });
  batch.update(storesCol().doc(storeId).collection('members').doc(currentOwnerId), { role: 'manager' });
  batch.update(storesCol().doc(storeId).collection('members').doc(newOwnerId), { role: 'owner' });
  await batch.commit();
}

export async function acceptStoreInvitation(token: string, uid: string, email?: string): Promise<{ storeId: string; role: string }> {
  const tokenSnap = await invitationTokensCol().doc(token).get();
  if (!tokenSnap.exists) throw new Error('招待が見つかりません');

  const tokenData = tokenSnap.data()!;
  if (tokenData.acceptedAt) throw new Error('この招待は既に使用されています');
  if (new Date(tokenData.expiresAt) < new Date()) throw new Error('招待の有効期限が切れています');

  const storeId = tokenData.storeId as string;
  const invitationId = tokenData.invitationId as string;
  const role = tokenData.role as Exclude<StoreRole, 'owner'>;

  const memberSnap = await storesCol().doc(storeId).collection('members').doc(uid).get();
  if (memberSnap.exists) throw new Error('既にこの店舗のメンバーです');

  const settings = await getUserSettings(uid);
  const plan = await getStoreOwnerPlan(storeId);
  const [members, pending] = await Promise.all([
    listStoreMembers(storeId),
    countPendingInvites(storeId),
  ]);
  if (!canAddStaff(plan, members.length, Math.max(0, pending - 1))) {
    throw new Error('店舗のメンバー上限に達しています');
  }

  const batch = db().batch();
  batch.set(storesCol().doc(storeId).collection('members').doc(uid), {
    userId: uid,
    role,
    email: email ?? settings.email,
    displayName: settings.displayName,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db().collection('users').doc(uid), {
    storeIds: FieldValue.arrayUnion(storeId),
    activeStoreId: storeId,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.update(storesCol().doc(storeId).collection('invitations').doc(invitationId), {
    acceptedAt: new Date().toISOString(),
  });
  batch.update(invitationTokensCol().doc(token), { acceptedAt: new Date().toISOString() });
  await batch.commit();

  return { storeId, role };
}

export async function getInvitationByToken(token: string) {
  const snap = await invitationTokensCol().doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const expired = !!data.acceptedAt || new Date(data.expiresAt) < new Date();
  return {
    storeName: data.storeName ?? '店舗',
    role: data.role,
    expired,
  };
}
