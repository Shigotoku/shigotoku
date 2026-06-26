import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { effectivePlanId } from '../lib/internalAccess';
import { PLAN_LIMITS, planFeatures, planLabel } from '../lib/plans';
import type { MemberRole, PlanId } from '../types';
import { getOrganization } from './bootstrap';
import { listOrgMembers } from './team';

export interface ClipitInvitation {
  token: string;
  organizationId: string;
  email: string;
  role: MemberRole;
  createdBy: string;
  createdAt?: Timestamp;
  acceptedAt?: Timestamp | null;
  expiresAt?: Timestamp | null;
}

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function assertCanInviteStaff(orgId: string): Promise<void> {
  const org = await getOrganization(orgId);
  const plan = effectivePlanId((org?.plan ?? 'free') as PlanId, auth.currentUser?.email);
  const features = planFeatures(plan);
  if (!features.staffInvite) {
    throw new Error(
      `スタッフ招待は${planLabel('standard')}プラン以上で利用できます。設定 → プランをご確認ください。`,
    );
  }
  const limits = PLAN_LIMITS[plan];
  const members = await listOrgMembers(orgId);
  const pending = await listPendingInvitations(orgId);
  const total = members.length + pending.length;
  if (total >= limits.maxStaff) {
    throw new Error(
      `「${planLabel(plan)}」はスタッフ${limits.maxStaff}名までです。プランを上げるか、招待待ちを整理してください。`,
    );
  }
}

export async function createInvitation(input: {
  organizationId: string;
  email: string;
  role: MemberRole;
  createdBy: string;
}): Promise<{ token: string; url: string }> {
  await assertCanInviteStaff(input.organizationId);
  const token = randomToken();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 86_400_000));
  await setDoc(doc(db, 'clipit_invitations', token), {
    organizationId: input.organizationId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    acceptedAt: null,
    expiresAt,
  });
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.clipit.shigotoku.com';
  return { token, url: `${base}/invite/${token}` };
}

export async function listPendingInvitations(orgId: string): Promise<ClipitInvitation[]> {
  const q = query(
    collection(db, 'clipit_invitations'),
    where('organizationId', '==', orgId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ token: d.id, ...d.data() }) as ClipitInvitation)
    .filter((i) => !i.acceptedAt);
}

export async function cancelInvitation(token: string): Promise<void> {
  await deleteDoc(doc(db, 'clipit_invitations', token));
}

export async function getInvitation(token: string): Promise<ClipitInvitation | null> {
  const snap = await getDoc(doc(db, 'clipit_invitations', token));
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<ClipitInvitation, 'token'>;
  if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) return null;
  if (data.acceptedAt) return null;
  return { token: snap.id, ...data };
}

export async function acceptInvitation(
  token: string,
  uid: string,
  userEmail: string,
  displayName: string,
): Promise<string> {
  const inv = await getInvitation(token);
  if (!inv) throw new Error('招待リンクが無効または期限切れです');

  const normalizedEmail = userEmail.trim().toLowerCase();
  if (normalizedEmail !== inv.email) {
    throw new Error(
      `この招待は ${inv.email} 向けです。現在 ${userEmail} でログインしています。招待先のメールアドレスでログインしてください。`,
    );
  }

  const memberRef = doc(db, 'clipit_organizations', inv.organizationId, 'members', uid);
  const existingMember = await getDoc(memberRef);
  if (existingMember.exists()) {
    await updateDoc(doc(db, 'clipit_invitations', token), { acceptedAt: serverTimestamp() });
    return inv.organizationId;
  }

  const userRef = doc(db, 'clipit_users', uid);
  const existingUser = await getDoc(userRef);
  if (existingUser.exists()) {
    const currentOrgId = existingUser.data()?.organizationId as string;
    if (currentOrgId && currentOrgId !== inv.organizationId) {
      throw new Error(
        'すでに別の組織に所属しています。招待を受けるには、別のGoogleアカウントでログインしてください。',
      );
    }
  }

  const orgId = inv.organizationId;
  await setDoc(memberRef, {
    role: inv.role,
    email: normalizedEmail,
    name: displayName,
    joinedAt: serverTimestamp(),
  });
  await setDoc(userRef, {
    organizationId: orgId,
    email: normalizedEmail,
    name: displayName,
    role: inv.role,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  }, { merge: true });
  await updateDoc(doc(db, 'clipit_invitations', token), {
    acceptedAt: serverTimestamp(),
  });
  return orgId;
}
