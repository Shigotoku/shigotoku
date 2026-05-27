import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  runTransaction,
  arrayUnion,
  arrayRemove,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { INCLUDED_SEATS } from './billing';
import { db } from './firebase';
import type { Database } from './database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type CompanyRow = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];
type MemberRow = Database['public']['Tables']['company_members']['Row'];
type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
type InvitationRow = Database['public']['Tables']['invitations']['Row'];
type AuditRow = Database['public']['Tables']['audit_logs']['Row'];

export const COL = {
  users: 'runwith_users',
  companies: 'runwith_companies',
  invitationTokens: 'runwith_invitation_tokens',
} as const;

const ADMIN_EMAIL = 'admin@shigotoku.com';

function tsToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function companyFromDoc(id: string, data: DocumentData): CompanyRow {
  return {
    id,
    name: data.name ?? '',
    name_kana: data.name_kana ?? '',
    industry: data.industry ?? '',
    phase: data.phase ?? 'idea',
    is_medical_mode: data.is_medical_mode ?? false,
    medical_fields: data.medical_fields ?? [],
    founded_date: data.founded_date ?? null,
    postal_code: data.postal_code ?? '',
    address: data.address ?? '',
    representative_name: data.representative_name ?? '',
    capital_amount: data.capital_amount ?? 0,
    employee_count: data.employee_count ?? 1,
    description: data.description ?? '',
    created_at: tsToIso(data.created_at),
    updated_at: tsToIso(data.updated_at),
  };
}

function profileFromDoc(id: string, data: DocumentData): ProfileRow {
  return {
    id,
    email: data.email ?? '',
    full_name: data.full_name ?? null,
    avatar_url: data.avatar_url ?? null,
    created_at: tsToIso(data.created_at),
    updated_at: tsToIso(data.updated_at),
  };
}

function subscriptionFromDoc(id: string, data: DocumentData): SubscriptionRow {
  return {
    id,
    user_id: data.user_id ?? null,
    company_id: data.company_id ?? null,
    plan: data.plan ?? 'free',
    medical_addon: data.medical_addon ?? false,
    included_seats: data.included_seats ?? INCLUDED_SEATS,
    stripe_customer_id: data.stripe_customer_id ?? null,
    stripe_subscription_id: data.stripe_subscription_id ?? null,
    stripe_price_id: data.stripe_price_id ?? null,
    current_period_start: data.current_period_start ?? null,
    current_period_end: data.current_period_end ?? null,
    cancel_at_period_end: data.cancel_at_period_end ?? false,
    status: data.status ?? 'active',
    created_at: tsToIso(data.created_at),
    updated_at: tsToIso(data.updated_at),
  };
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  fullName?: string | null,
): Promise<ProfileRow> {
  const userRef = doc(db, COL.users, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    const profile = {
      email,
      full_name: fullName ?? null,
      avatar_url: null,
      company_ids: [] as string[],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    await setDoc(userRef, profile);
    const subRef = doc(db, COL.users, uid, 'subscription', 'current');
    await setDoc(subRef, {
      user_id: uid,
      company_id: null,
      plan: 'free',
      medical_addon: false,
      included_seats: INCLUDED_SEATS,
      status: 'active',
      cancel_at_period_end: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return profileFromDoc(uid, { ...profile, created_at: new Date(), updated_at: new Date() });
  }
  return profileFromDoc(uid, snap.data());
}

export async function getProfile(uid: string): Promise<ProfileRow | null> {
  const snap = await getDoc(doc(db, COL.users, uid));
  if (!snap.exists()) return null;
  return profileFromDoc(uid, snap.data());
}

export async function updateProfileDoc(
  uid: string,
  updates: { full_name?: string; avatar_url?: string },
): Promise<ProfileRow> {
  const ref = doc(db, COL.users, uid);
  await updateDoc(ref, { ...updates, updated_at: serverTimestamp() });
  const snap = await getDoc(ref);
  return profileFromDoc(uid, snap.data()!);
}

export async function fetchUserCompanies(userId: string): Promise<CompanyRow[]> {
  const userSnap = await getDoc(doc(db, COL.users, userId));
  if (!userSnap.exists()) return [];
  const companyIds: string[] = userSnap.data().company_ids ?? [];
  if (!companyIds.length) return [];

  const companies = await Promise.all(
    companyIds.map(async (id) => {
      const snap = await getDoc(doc(db, COL.companies, id));
      if (!snap.exists()) return null;
      return companyFromDoc(id, snap.data());
    }),
  );
  return companies.filter(Boolean) as CompanyRow[];
}

export async function createCompanyWithMember(
  userId: string,
  companyData: CompanyInsert,
): Promise<CompanyRow> {
  const companyRef = doc(collection(db, COL.companies));
  const memberRef = doc(db, COL.companies, companyRef.id, 'members', userId);
  const userRef = doc(db, COL.users, userId);

  const payload = {
    name: companyData.name ?? '',
    name_kana: companyData.name_kana ?? '',
    industry: companyData.industry ?? '',
    phase: companyData.phase ?? 'idea',
    is_medical_mode: companyData.is_medical_mode ?? false,
    medical_fields: companyData.medical_fields ?? [],
    founded_date: companyData.founded_date ?? null,
    postal_code: companyData.postal_code ?? '',
    address: companyData.address ?? '',
    representative_name: companyData.representative_name ?? '',
    capital_amount: companyData.capital_amount ?? 0,
    employee_count: companyData.employee_count ?? 1,
    description: companyData.description ?? '',
    owner_id: userId,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(companyRef, payload);
  batch.set(memberRef, {
    company_id: companyRef.id,
    user_id: userId,
    role: 'owner',
    created_at: serverTimestamp(),
  });
  batch.set(doc(db, COL.companies, companyRef.id, 'subscription', 'current'), {
    company_id: companyRef.id,
    user_id: null,
    plan: 'free',
    medical_addon: false,
    included_seats: INCLUDED_SEATS,
    status: 'active',
    cancel_at_period_end: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  batch.set(userRef, {
    company_ids: arrayUnion(companyRef.id),
    updated_at: serverTimestamp(),
  }, { merge: true });
  await batch.commit();

  return companyFromDoc(companyRef.id, { ...payload, created_at: new Date(), updated_at: new Date() });
}

export async function updateCompanyDoc(
  companyId: string,
  updates: CompanyUpdate,
): Promise<CompanyRow> {
  const ref = doc(db, COL.companies, companyId);
  await updateDoc(ref, { ...updates, updated_at: serverTimestamp() });
  const snap = await getDoc(ref);
  return companyFromDoc(companyId, snap.data()!);
}

export async function deleteCompanyDoc(companyId: string) {
  await deleteDoc(doc(db, COL.companies, companyId));
}

export async function fetchCompanyMembers(
  companyId: string,
): Promise<(MemberRow & { profile?: { full_name: string | null; email: string } })[]> {
  const snap = await getDocs(collection(db, COL.companies, companyId, 'members'));
  const members: (MemberRow & { profile?: { full_name: string | null; email: string } })[] = [];

  for (const memberDoc of snap.docs) {
    const data = memberDoc.data();
    const profile = await getProfile(data.user_id);
    members.push({
      id: memberDoc.id,
      company_id: companyId,
      user_id: data.user_id,
      role: data.role,
      created_at: tsToIso(data.created_at),
      profile: profile
        ? { full_name: profile.full_name, email: profile.email }
        : undefined,
    });
  }
  return members;
}

export async function getUserRoleInCompany(
  companyId: string,
  userId: string,
): Promise<string | null> {
  const snap = await getDoc(doc(db, COL.companies, companyId, 'members', userId));
  if (!snap.exists()) return null;
  return snap.data().role as string;
}

export async function fetchSubscription(userId: string): Promise<SubscriptionRow | null> {
  const snap = await getDoc(doc(db, COL.users, userId, 'subscription', 'current'));
  if (!snap.exists()) return null;
  return subscriptionFromDoc(userId, snap.data());
}

export async function fetchCompanySubscription(companyId: string): Promise<SubscriptionRow | null> {
  const ref = doc(db, COL.companies, companyId, 'subscription', 'current');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      company_id: companyId,
      user_id: null,
      plan: 'free',
      medical_addon: false,
      included_seats: INCLUDED_SEATS,
      status: 'active',
      cancel_at_period_end: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    const created = await getDoc(ref);
    return subscriptionFromDoc(companyId, created.data()!);
  }
  return subscriptionFromDoc(companyId, snap.data());
}

export async function countCompanySeatUsage(companyId: string): Promise<{
  memberCount: number;
  pendingInviteCount: number;
}> {
  const [membersSnap, invitesSnap] = await Promise.all([
    getDocs(collection(db, COL.companies, companyId, 'members')),
    getDocs(collection(db, COL.companies, companyId, 'invitations')),
  ]);

  const pendingInviteCount = invitesSnap.docs.filter((d) => !d.data().accepted_at).length;

  return {
    memberCount: membersSnap.size,
    pendingInviteCount,
  };
}

export async function assertCompanyCanAddMember(companyId: string): Promise<void> {
  const [sub, usage] = await Promise.all([
    fetchCompanySubscription(companyId),
    countCompanySeatUsage(companyId),
  ]);
  if (!sub) throw new Error('会社のプラン情報が見つかりません');

  const occupied = usage.memberCount + usage.pendingInviteCount + 1;
  if (sub.plan === 'free' && occupied > INCLUDED_SEATS) {
    throw new Error(
      `Freeプランは${INCLUDED_SEATS}人までです。Growth以上にアップグレードすると追加メンバーを招待できます。`,
    );
  }
}

export async function updateCompanySubscriptionPlan(
  companyId: string,
  plan: 'free' | 'growth' | 'pro',
): Promise<SubscriptionRow> {
  const ref = doc(db, COL.companies, companyId, 'subscription', 'current');
  await updateDoc(ref, { plan, updated_at: serverTimestamp() });
  const snap = await getDoc(ref);
  return subscriptionFromDoc(companyId, snap.data()!);
}

export async function toggleCompanyMedicalAddon(
  companyId: string,
  enabled: boolean,
): Promise<SubscriptionRow> {
  const ref = doc(db, COL.companies, companyId, 'subscription', 'current');
  await updateDoc(ref, { medical_addon: enabled, updated_at: serverTimestamp() });
  const snap = await getDoc(ref);
  return subscriptionFromDoc(companyId, snap.data()!);
}

export async function updateSubscriptionPlan(
  userId: string,
  plan: 'free' | 'growth' | 'pro',
): Promise<SubscriptionRow> {
  const ref = doc(db, COL.users, userId, 'subscription', 'current');
  await updateDoc(ref, { plan, updated_at: serverTimestamp() });
  const snap = await getDoc(ref);
  return subscriptionFromDoc(userId, snap.data()!);
}

export async function toggleMedicalAddon(userId: string, enabled: boolean): Promise<SubscriptionRow> {
  const ref = doc(db, COL.users, userId, 'subscription', 'current');
  await updateDoc(ref, { medical_addon: enabled, updated_at: serverTimestamp() });
  const snap = await getDoc(ref);
  return subscriptionFromDoc(userId, snap.data()!);
}

export async function createInvitation(params: {
  companyId: string;
  invitedBy: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  token: string;
  companyName: string;
  inviterEmail: string;
}): Promise<{ token: string; inviteUrl: string }> {
  await assertCompanyCanAddMember(params.companyId);

  const invitationRef = doc(collection(db, COL.companies, params.companyId, 'invitations'));
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = {
    company_id: params.companyId,
    invited_by: params.invitedBy,
    email: params.email.toLowerCase(),
    role: params.role,
    token: params.token,
    expires_at: expiresAt.toISOString(),
    accepted_at: null,
    created_at: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(invitationRef, invitation);
  batch.set(doc(db, COL.invitationTokens, params.token), {
    company_id: params.companyId,
    invitation_id: invitationRef.id,
    company_name: params.companyName,
    inviter_email: params.inviterEmail,
    role: params.role,
    expires_at: expiresAt.toISOString(),
    accepted_at: null,
  });
  await batch.commit();

  return {
    token: params.token,
    inviteUrl: `${window.location.origin}/invite/${params.token}`,
  };
}

export async function fetchInvitationsByCompany(companyId: string): Promise<InvitationRow[]> {
  const snap = await getDocs(
    query(collection(db, COL.companies, companyId, 'invitations'), orderBy('created_at', 'desc')),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      company_id: companyId,
      invited_by: data.invited_by ?? null,
      email: data.email,
      role: data.role,
      token: data.token,
      expires_at: data.expires_at,
      accepted_at: data.accepted_at ?? null,
      created_at: tsToIso(data.created_at),
    };
  });
}

export async function fetchInvitationByToken(token: string) {
  const snap = await getDoc(doc(db, COL.invitationTokens, token));
  if (!snap.exists()) return null;
  const data = snap.data();
  const expired =
    data.accepted_at !== null || new Date(data.expires_at) < new Date();
  return {
    companyName: data.company_name ?? '不明な会社',
    inviterEmail: data.inviter_email ?? '',
    role: data.role,
    expired,
  };
}

export async function acceptInvitation(token: string, userId: string) {
  const tokenSnap = await getDoc(doc(db, COL.invitationTokens, token));
  if (!tokenSnap.exists()) throw new Error('招待が見つかりません');

  const tokenData = tokenSnap.data();
  if (tokenData.accepted_at) throw new Error('この招待は既に使用されています');
  if (new Date(tokenData.expires_at) < new Date()) throw new Error('招待の有効期限が切れています');

  const companyId = tokenData.company_id as string;

  return runTransaction(db, async (tx) => {
    const tokenRef = doc(db, COL.invitationTokens, token);
    const freshTokenSnap = await tx.get(tokenRef);
    if (!freshTokenSnap.exists()) throw new Error('招待が見つかりません');

    const freshTokenData = freshTokenSnap.data();
    if (freshTokenData.accepted_at) throw new Error('この招待は既に使用されています');

    const invitationId = freshTokenData.invitation_id as string;
    const role = freshTokenData.role as string;

    const memberRef = doc(db, COL.companies, companyId, 'members', userId);
    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists()) throw new Error('既にこの会社のメンバーです');

    tx.set(memberRef, {
      company_id: companyId,
      user_id: userId,
      role,
      created_at: serverTimestamp(),
    });
    tx.set(doc(db, COL.users, userId), {
      company_ids: arrayUnion(companyId),
      updated_at: serverTimestamp(),
    }, { merge: true });
    tx.update(doc(db, COL.companies, companyId, 'invitations', invitationId), {
      accepted_at: new Date().toISOString(),
    });
    tx.update(tokenRef, { accepted_at: new Date().toISOString() });

    return { companyId, role };
  });
}

export async function revokeInvitation(companyId: string, invitationId: string, token?: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, COL.companies, companyId, 'invitations', invitationId));
  if (token) batch.delete(doc(db, COL.invitationTokens, token));
  await batch.commit();
}

export async function removeCompanyMember(companyId: string, targetUserId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, COL.companies, companyId, 'members', targetUserId));
  batch.set(
    doc(db, COL.users, targetUserId),
    { company_ids: arrayRemove(companyId), updated_at: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();
}

export async function updateCompanyMemberRole(
  companyId: string,
  targetUserId: string,
  role: 'admin' | 'member' | 'viewer',
): Promise<void> {
  await updateDoc(doc(db, COL.companies, companyId, 'members', targetUserId), {
    role,
    updated_at: serverTimestamp(),
  });
}

export async function transferCompanyOwnership(
  companyId: string,
  currentOwnerId: string,
  newOwnerId: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, COL.companies, companyId), {
    owner_id: newOwnerId,
    updated_at: serverTimestamp(),
  });
  batch.update(doc(db, COL.companies, companyId, 'members', currentOwnerId), {
    role: 'admin',
    updated_at: serverTimestamp(),
  });
  batch.update(doc(db, COL.companies, companyId, 'members', newOwnerId), {
    role: 'owner',
    updated_at: serverTimestamp(),
  });
  await batch.commit();
}

export async function getCompanyName(companyId: string): Promise<string> {
  const snap = await getDoc(doc(db, COL.companies, companyId));
  return snap.exists() ? (snap.data().name ?? '') : '';
}

export async function writeAuditLog(entry: {
  companyId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    company_id: entry.companyId ?? null,
    user_id: entry.userId ?? null,
    action: entry.action,
    resource_type: entry.resourceType ?? null,
    resource_id: entry.resourceId ?? null,
    metadata: entry.metadata ?? {},
    user_agent: navigator.userAgent,
    created_at: serverTimestamp(),
  };

  if (entry.companyId) {
    const logRef = doc(collection(db, COL.companies, entry.companyId, 'audit_logs'));
    await setDoc(logRef, payload);
    return;
  }

  if (entry.userId) {
    const logRef = doc(collection(db, COL.users, entry.userId, 'audit_logs'));
    await setDoc(logRef, payload);
  }
}

export async function fetchAuditLogs(companyId: string, max = 50): Promise<AuditRow[]> {
  const snap = await getDocs(
    query(
      collection(db, COL.companies, companyId, 'audit_logs'),
      orderBy('created_at', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      company_id: data.company_id ?? null,
      user_id: data.user_id ?? null,
      action: data.action,
      resource_type: data.resource_type ?? null,
      resource_id: data.resource_id ?? null,
      metadata: data.metadata ?? {},
      ip_address: data.ip_address ?? null,
      user_agent: data.user_agent ?? null,
      created_at: tsToIso(data.created_at),
    };
  });
}

export async function fetchAllProfilesForAdmin(): Promise<ProfileRow[]> {
  const snap = await getDocs(collection(db, COL.users));
  return snap.docs.map((d) => profileFromDoc(d.id, d.data()));
}

export async function fetchAllCompaniesForAdmin(): Promise<CompanyRow[]> {
  const snap = await getDocs(collection(db, COL.companies));
  return snap.docs.map((d) => companyFromDoc(d.id, d.data()));
}

export async function fetchAllSubscriptionsForAdmin(): Promise<SubscriptionRow[]> {
  const users = await getDocs(collection(db, COL.users));
  const subs: SubscriptionRow[] = [];
  for (const userDoc of users.docs) {
    const subSnap = await getDoc(doc(db, COL.users, userDoc.id, 'subscription', 'current'));
    if (subSnap.exists()) subs.push(subscriptionFromDoc(userDoc.id, subSnap.data()));
  }
  return subs;
}

export async function fetchUserCompanyMemberships(userId: string) {
  const snap = await getDocs(
    query(collection(db, COL.companies), where('owner_id', '==', userId)),
  );
  return snap.docs;
}

export function isAdminEmail(email: string | null | undefined) {
  return email === ADMIN_EMAIL;
}
