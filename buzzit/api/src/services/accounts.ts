/**
 * アカウント（課金主体）管理 — 個人 / 法人、モニター / 課金
 */
import { randomBytes } from 'crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { PlanTier, UserSettings } from './firestore';
import {
  computeAccountMonthlyTotal,
  EXTRA_ACCOUNT_SEAT_MONTHLY,
  INDIVIDUAL_MAX_ACCOUNTS,
} from './billing';
import { createPaymentCustomer, getActivePaymentProvider } from './paymentProvider';
import { buildAccountInviteEmail, isMailConfigured, sendTransactionalEmail } from './mail';
import type {
  AccountEntitlements,
  AccountInvitationRecord,
  AccountMemberRecord,
  AccountMemberRole,
  AccountRecord,
  AccountSetupInput,
  AdminAccountPatch,
  BillingStatus,
} from '../types/account';

function db() {
  return getFirestore();
}

function accountsCol() {
  return db().collection('accounts');
}

function auditCol() {
  return db().collection('admin_audit_log');
}

function accountInvitationTokensCol() {
  return db().collection('buzzit_account_invitation_tokens');
}

function appOrigin(): string {
  return process.env.BUZZIT_APP_ORIGIN ?? 'https://app.buzzit.shigotoku.com';
}

const ACCOUNT_ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  member: 'メンバー',
};

export function isBillingExempt(account: AccountRecord): boolean {
  if (account.billingExempt) return true;
  if (account.billingStatus === 'monitor') return true;
  if (account.billingExemptExpiresAt) {
    return new Date(account.billingExemptExpiresAt) > new Date();
  }
  return false;
}

export function buildEntitlements(account: AccountRecord): AccountEntitlements {
  const extraSeats = Math.max(0, account.seatCount - account.includedSeats);
  const exempt = isBillingExempt(account);
  return {
    accountId: account.id,
    accountType: account.accountType,
    billingStatus: account.billingStatus,
    plan: account.plan,
    chargeable: !exempt && account.billingStatus === 'active',
    billingExempt: exempt,
    companyName: account.companyName,
    seatCount: account.seatCount,
    includedSeats: account.includedSeats,
    extraSeats,
    monthlyEstimate: computeAccountMonthlyTotal(account),
    paymentProvider: account.paymentProvider ?? null,
  };
}

export async function getAccount(accountId: string): Promise<AccountRecord | null> {
  const snap = await accountsCol().doc(accountId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<AccountRecord, 'id'>) };
}

export async function getAccountForUser(uid: string): Promise<AccountRecord | null> {
  const userSnap = await db().collection('users').doc(uid).get();
  const accountId = userSnap.data()?.accountId as string | undefined;
  if (!accountId) return null;
  return getAccount(accountId);
}

export async function resolveEntitlements(uid: string): Promise<AccountEntitlements | null> {
  const account = await getAccountForUser(uid);
  if (!account) return null;
  return buildEntitlements(account);
}

/** users.plan をアカウントの plan に同期（後方互換） */
export async function syncUserPlanFromAccount(uid: string): Promise<void> {
  const account = await getAccountForUser(uid);
  if (!account) return;
  await db().collection('users').doc(uid).set(
    { plan: account.plan, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function listAccountMembers(accountId: string): Promise<AccountMemberRecord[]> {
  const snap = await accountsCol().doc(accountId).collection('members').get();
  return snap.docs.map((d) => ({
    userId: d.id,
    ...(d.data() as Omit<AccountMemberRecord, 'userId'>),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? d.data().createdAt ?? '',
  }));
}

export async function userHasAccount(uid: string): Promise<boolean> {
  const snap = await db().collection('users').doc(uid).get();
  return !!snap.data()?.accountId;
}

/** 個人は1アカウントのみ。既に所属している場合は false */
export async function canUserCreateAccount(uid: string): Promise<{ ok: boolean; reason?: string }> {
  const existing = await getAccountForUser(uid);
  if (existing) {
    return { ok: false, reason: '既にアカウントに所属しています' };
  }

  const memberQuery = await db()
    .collectionGroup('members')
    .where('userId', '==', uid)
    .limit(1)
    .get()
    .catch(() => null);

  if (memberQuery && !memberQuery.empty) {
    return { ok: false, reason: '既に別のアカウントに所属しています' };
  }

  const owned = await accountsCol().where('ownerUid', '==', uid).get();
  if (owned.size >= INDIVIDUAL_MAX_ACCOUNTS) {
    const userSnap = await db().collection('users').doc(uid).get();
    const type = userSnap.data()?.accountType;
    if (type === 'individual' || owned.docs.some((d) => d.data().accountType === 'individual')) {
      return { ok: false, reason: '個人アカウントは1つまで作成できます' };
    }
  }

  return { ok: true };
}

export async function setupAccount(
  uid: string,
  input: AccountSetupInput,
  userEmail?: string,
  displayName?: string,
): Promise<{ account: AccountRecord; entitlements: AccountEntitlements }> {
  const canCreate = await canUserCreateAccount(uid);
  if (!canCreate.ok) {
    throw new Error(canCreate.reason ?? 'アカウントを作成できません');
  }

  if (input.accountType === 'business' && !input.companyName?.trim()) {
    throw new Error('法人アカウントには会社名が必要です');
  }

  const now = new Date().toISOString();
  const accountRef = accountsCol().doc();
  const account: Omit<AccountRecord, 'id'> = {
    accountType: input.accountType,
    billingStatus: 'monitor',
    plan: 'starter',
    billingExempt: true,
    billingExemptType: 'monitor',
    billingExemptReason: '新規登録（初期モニター）',
    includedSeats: 1,
    seatCount: 1,
    ownerUid: uid,
    paymentProvider: null,
    createdAt: now,
    ...(input.accountType === 'business'
      ? {
          companyName: input.companyName!.trim(),
          companyTaxId: input.companyTaxId?.trim(),
        }
      : {}),
  };

  const batch = db().batch();
  batch.set(accountRef, { ...account, updatedAt: FieldValue.serverTimestamp() });
  batch.set(accountRef.collection('members').doc(uid), {
    userId: uid,
    role: 'owner',
    email: userEmail,
    displayName,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db().collection('users').doc(uid), {
    accountId: accountRef.id,
    accountType: input.accountType,
    accountSetupComplete: true,
    plan: account.plan,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await batch.commit();

  const created: AccountRecord = { id: accountRef.id, ...account };
  return { account: created, entitlements: buildEntitlements(created) };
}

async function syncMemberStores(accountId: string, userId: string, email?: string, displayName?: string) {
  const storesSnap = await db().collection('stores').where('accountId', '==', accountId).get();
  const storeIds: string[] = [];
  const batch = db().batch();

  for (const storeDoc of storesSnap.docs) {
    storeIds.push(storeDoc.id);
    batch.set(storeDoc.ref.collection('members').doc(userId), {
      userId,
      role: 'staff',
      email,
      displayName,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  if (storeIds.length > 0) {
    batch.set(db().collection('users').doc(userId), {
      storeIds: FieldValue.arrayUnion(...storeIds),
      activeStoreId: storeIds[0],
    }, { merge: true });
  }

  await batch.commit();
}

export async function listAccountInvitations(accountId: string): Promise<AccountInvitationRecord[]> {
  const snap = await accountsCol()
    .doc(accountId)
    .collection('invitations')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AccountInvitationRecord, 'id'>),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? d.data().createdAt ?? '',
  }));
}

async function assertCanInvite(accountId: string, actorUid: string, normalizedEmail: string) {
  const account = await getAccount(accountId);
  if (!account) throw new Error('アカウントが見つかりません');
  if (account.accountType === 'individual') {
    throw new Error('個人アカウントにはメンバーを追加できません');
  }

  const actorMember = await accountsCol().doc(accountId).collection('members').doc(actorUid).get();
  const actorRole = actorMember.data()?.role;
  if (!actorMember.exists || (actorRole !== 'owner' && actorRole !== 'admin')) {
    throw new Error('メンバー招待の権限がありません');
  }

  const pending = await accountsCol()
    .doc(accountId)
    .collection('invitations')
    .where('email', '==', normalizedEmail)
    .get();
  if (pending.docs.some((d) => !d.data().acceptedAt)) {
    throw new Error('このメールアドレスには既に招待を送信しています');
  }

  const members = await listAccountMembers(accountId);
  if (members.some((m) => m.email?.toLowerCase() === normalizedEmail)) {
    throw new Error('このメールアドレスは既にメンバーです');
  }
}

export async function createAccountInvitation(
  accountId: string,
  email: string,
  actorUid: string,
  role: 'admin' | 'member' = 'member',
): Promise<{ invitation: AccountInvitationRecord; inviteUrl: string; emailSent: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error('メールアドレスを入力してください');

  await assertCanInvite(accountId, actorUid, normalized);

  const account = await getAccount(accountId);
  const actorSnap = await db().collection('users').doc(actorUid).get();
  const inviterName = actorSnap.data()?.displayName as string | undefined;

  const token = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const invRef = accountsCol().doc(accountId).collection('invitations').doc();

  const invitationData = {
    accountId,
    email: normalized,
    role,
    token,
    invitedBy: actorUid,
    inviterName,
    companyName: account?.companyName,
    expiresAt,
    acceptedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = db().batch();
  batch.set(invRef, invitationData);
  batch.set(accountInvitationTokensCol().doc(token), {
    accountId,
    invitationId: invRef.id,
    email: normalized,
    role,
    companyName: account?.companyName ?? '会社',
    inviterName,
    expiresAt,
    acceptedAt: null,
  });
  await batch.commit();

  const inviteUrl = `${appOrigin()}/account-invite/${token}`;
  const invitation: AccountInvitationRecord = {
    id: invRef.id,
    accountId,
    email: normalized,
    role,
    token,
    invitedBy: actorUid,
    inviterName,
    companyName: account?.companyName,
    expiresAt,
    acceptedAt: null,
    createdAt: new Date().toISOString(),
  };

  let emailSent = false;
  if (isMailConfigured()) {
    const mail = buildAccountInviteEmail({
      companyName: account?.companyName ?? '会社',
      inviterName,
      roleLabel: ACCOUNT_ROLE_LABELS[role] ?? role,
      inviteUrl,
      expiresAt,
    });
    await sendTransactionalEmail({ to: normalized, ...mail });
    emailSent = true;
  }

  return { invitation, inviteUrl, emailSent };
}

export async function revokeAccountInvitation(
  accountId: string,
  invitationId: string,
  actorUid: string,
  token?: string,
): Promise<void> {
  const actorRole = await getAccountMemberRole(accountId, actorUid);
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    throw new Error('招待取り消しの権限がありません');
  }
  const batch = db().batch();
  batch.delete(accountsCol().doc(accountId).collection('invitations').doc(invitationId));
  if (token) batch.delete(accountInvitationTokensCol().doc(token));
  await batch.commit();
}

export async function getAccountInvitationByToken(token: string): Promise<{
  companyName: string;
  role: string;
  email: string;
  inviterName?: string;
  expired: boolean;
} | null> {
  const snap = await accountInvitationTokensCol().doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.acceptedAt) return null;
  const expired = new Date(data.expiresAt as string) < new Date();
  return {
    companyName: (data.companyName as string) ?? '会社',
    role: (data.role as string) ?? 'member',
    email: (data.email as string) ?? '',
    inviterName: data.inviterName as string | undefined,
    expired,
  };
}

export async function acceptAccountInvitation(
  token: string,
  uid: string,
  userEmail?: string,
): Promise<{ accountId: string; companyName?: string }> {
  const tokenSnap = await accountInvitationTokensCol().doc(token).get();
  if (!tokenSnap.exists) throw new Error('招待が見つかりません');

  const tokenData = tokenSnap.data()!;
  if (tokenData.acceptedAt) throw new Error('この招待は既に使用されています');
  if (new Date(tokenData.expiresAt as string) < new Date()) {
    throw new Error('招待の有効期限が切れています');
  }

  const inviteEmail = (tokenData.email as string).toLowerCase();
  const normalizedUserEmail = userEmail?.trim().toLowerCase();
  if (!normalizedUserEmail || normalizedUserEmail !== inviteEmail) {
    throw new Error('招待されたメールアドレスとログイン中のアカウントが一致しません');
  }

  const accountId = tokenData.accountId as string;
  const invitationId = tokenData.invitationId as string;
  const role = (tokenData.role as 'admin' | 'member') ?? 'member';

  const existing = await getAccountForUser(uid);
  if (existing && existing.id !== accountId) {
    throw new Error('既に別の会社アカウントに所属しています');
  }

  await addAccountMember(accountId, {
    userId: uid,
    email: inviteEmail,
    role,
  }, tokenData.invitedBy as string);

  const batch = db().batch();
  batch.update(accountsCol().doc(accountId).collection('invitations').doc(invitationId), {
    acceptedAt: new Date().toISOString(),
  });
  batch.update(accountInvitationTokensCol().doc(token), {
    acceptedAt: new Date().toISOString(),
  });
  await batch.commit();

  const account = await getAccount(accountId);
  return { accountId, companyName: account?.companyName };
}

export type InviteAccountMemberResult =
  | { kind: 'member'; member: AccountMemberRecord; emailSent: false }
  | { kind: 'invitation'; invitation: AccountInvitationRecord; inviteUrl: string; emailSent: boolean };

export async function inviteAccountMemberByEmail(
  accountId: string,
  email: string,
  actorUid: string,
  role: 'admin' | 'member' = 'member',
): Promise<InviteAccountMemberResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error('メールアドレスを入力してください');

  await assertCanInvite(accountId, actorUid, normalized);

  let targetUser;
  try {
    targetUser = await getAuth().getUserByEmail(normalized);
  } catch {
    const invited = await createAccountInvitation(accountId, normalized, actorUid, role);
    return {
      kind: 'invitation',
      invitation: invited.invitation,
      inviteUrl: invited.inviteUrl,
      emailSent: invited.emailSent,
    };
  }

  const member = await addAccountMember(accountId, {
    userId: targetUser.uid,
    email: targetUser.email,
    displayName: targetUser.displayName,
    role,
  }, actorUid);

  return { kind: 'member', member, emailSent: false };
}

export async function addAccountMember(
  accountId: string,
  params: { userId: string; email?: string; displayName?: string; role?: 'admin' | 'member' },
  actorUid: string,
): Promise<AccountMemberRecord> {
  const account = await getAccount(accountId);
  if (!account) throw new Error('アカウントが見つかりません');

  if (account.accountType === 'individual') {
    throw new Error('個人アカウントにはメンバーを追加できません。法人アカウントに切り替えてください');
  }

  const actorMember = await accountsCol().doc(accountId).collection('members').doc(actorUid).get();
  const actorRole = actorMember.data()?.role;
  if (!actorMember.exists || (actorRole !== 'owner' && actorRole !== 'admin')) {
    throw new Error('メンバー追加の権限がありません');
  }

  const existingUserAccount = await getAccountForUser(params.userId);
  if (existingUserAccount && existingUserAccount.id !== accountId) {
    throw new Error('このユーザーは既に別のアカウントに所属しています');
  }

  const memberRef = accountsCol().doc(accountId).collection('members').doc(params.userId);
  if (memberRef.id && (await memberRef.get()).exists) {
    throw new Error('このユーザーは既にメンバーです');
  }

  const batch = db().batch();
  batch.set(memberRef, {
    userId: params.userId,
    role: params.role ?? 'member',
    email: params.email,
    displayName: params.displayName,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(accountsCol().doc(accountId), {
    seatCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(db().collection('users').doc(params.userId), {
    accountId,
    accountType: 'business',
    accountSetupComplete: true,
    plan: account.plan,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  await syncMemberStores(accountId, params.userId, params.email, params.displayName);

  return {
    userId: params.userId,
    role: params.role ?? 'member',
    email: params.email,
    displayName: params.displayName,
    createdAt: new Date().toISOString(),
  };
}

export async function removeAccountMember(
  accountId: string,
  targetUserId: string,
  actorUid: string,
): Promise<void> {
  const account = await getAccount(accountId);
  if (!account) throw new Error('アカウントが見つかりません');
  if (targetUserId === account.ownerUid) {
    throw new Error('オーナーは削除できません');
  }

  const actorMember = await accountsCol().doc(accountId).collection('members').doc(actorUid).get();
  const actorRole = actorMember.data()?.role;
  if (!actorMember.exists || (actorRole !== 'owner' && actorRole !== 'admin')) {
    throw new Error('メンバー削除の権限がありません');
  }

  const batch = db().batch();
  batch.delete(accountsCol().doc(accountId).collection('members').doc(targetUserId));
  batch.update(accountsCol().doc(accountId), {
    seatCount: FieldValue.increment(-1),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const storesSnap = await db().collection('stores').where('accountId', '==', accountId).get();
  for (const storeDoc of storesSnap.docs) {
    batch.delete(storeDoc.ref.collection('members').doc(targetUserId));
  }
  batch.set(db().collection('users').doc(targetUserId), {
    accountId: FieldValue.delete(),
    accountSetupComplete: false,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
}

export async function getAccountMemberRole(accountId: string, uid: string): Promise<AccountMemberRole | null> {
  const snap = await accountsCol().doc(accountId).collection('members').doc(uid).get();
  if (!snap.exists) return null;
  return snap.data()?.role as AccountMemberRole;
}

async function writeAuditLog(entry: {
  actorUid: string;
  actorEmail?: string;
  action: string;
  accountId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  await auditCol().add({
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listAllAccounts(limit = 100): Promise<Array<AccountRecord & { ownerEmail?: string }>> {
  const snap = await accountsCol().orderBy('createdAt', 'desc').limit(limit).get();
  const results: Array<AccountRecord & { ownerEmail?: string }> = [];

  for (const doc of snap.docs) {
    const data = doc.data() as Omit<AccountRecord, 'id'>;
    const ownerSnap = await db().collection('users').doc(data.ownerUid).get();
    results.push({
      id: doc.id,
      ...data,
      ownerEmail: ownerSnap.data()?.email as string | undefined,
    });
  }

  return results;
}

export async function adminUpdateAccount(
  accountId: string,
  patch: AdminAccountPatch,
  actor: { uid: string; email?: string },
): Promise<AccountRecord> {
  const ref = accountsCol().doc(accountId);
  const before = await ref.get();
  if (!before.exists) throw new Error('アカウントが見つかりません');

  const beforeData = before.data() as AccountRecord;
  const safe: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  for (const key of [
    'billingStatus', 'plan', 'billingExempt', 'billingExemptType',
    'billingExemptReason', 'billingExemptGrantedBy', 'companyName', 'companyTaxId', 'includedSeats',
  ] as const) {
    if (key in patch && patch[key] !== undefined) {
      safe[key] = patch[key];
    }
  }
  if ('billingExemptExpiresAt' in patch) {
    safe.billingExemptExpiresAt = patch.billingExemptExpiresAt ?? FieldValue.delete();
  }

  await ref.set(safe, { merge: true });

  const updated = await getAccount(accountId);
  if (!updated) throw new Error('更新後のアカウント取得に失敗しました');

  const members = await listAccountMembers(accountId);
  const batch = db().batch();
  for (const m of members) {
    batch.set(db().collection('users').doc(m.userId), {
      plan: updated.plan,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();

  if (
    patch.billingStatus === 'active' &&
    !isBillingExempt(updated) &&
    !updated.paymentCustomerId
  ) {
    const ownerSnap = await db().collection('users').doc(updated.ownerUid).get();
    const email = ownerSnap.data()?.email as string | undefined;
    if (email) {
      const customer = await createPaymentCustomer({
        email,
        name: updated.companyName ?? ownerSnap.data()?.displayName as string | undefined,
        metadata: { accountId, uid: updated.ownerUid },
      });
      if (customer) {
        await ref.set({
          paymentProvider: customer.provider,
          paymentCustomerId: customer.customerId,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
  }

  await writeAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: 'account.update',
    accountId,
    before: beforeData as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });

  return updated;
}

/** 既存ユーザーをアカウントに移行（CLI / 管理用） */
export async function migrateUserToAccount(
  uid: string,
  input: AccountSetupInput & {
    billingStatus?: BillingStatus;
    plan?: PlanTier;
    billingExempt?: boolean;
    billingExemptReason?: string;
    billingExemptGrantedBy?: string;
  },
  userEmail?: string,
  displayName?: string,
): Promise<AccountRecord> {
  const existing = await getAccountForUser(uid);
  if (existing) return existing;

  const now = new Date().toISOString();
  const accountRef = accountsCol().doc();
  const account: Omit<AccountRecord, 'id'> = {
    accountType: input.accountType,
    billingStatus: input.billingStatus ?? 'monitor',
    plan: input.plan ?? 'starter',
    billingExempt: input.billingExempt ?? input.billingStatus === 'monitor',
    billingExemptType: 'monitor',
    billingExemptReason: input.billingExemptReason,
    billingExemptGrantedBy: input.billingExemptGrantedBy,
    includedSeats: 1,
    seatCount: 1,
    ownerUid: uid,
    paymentProvider: getActivePaymentProvider(),
    createdAt: now,
    ...(input.accountType === 'business'
      ? { companyName: input.companyName?.trim(), companyTaxId: input.companyTaxId?.trim() }
      : {}),
  };

  const batch = db().batch();
  batch.set(accountRef, { ...account, updatedAt: FieldValue.serverTimestamp() });
  batch.set(accountRef.collection('members').doc(uid), {
    userId: uid,
    role: 'owner',
    email: userEmail,
    displayName,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db().collection('users').doc(uid), {
    accountId: accountRef.id,
    accountType: input.accountType,
    accountSetupComplete: true,
    plan: account.plan,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const userSnap = await db().collection('users').doc(uid).get();
  const storeIds = (userSnap.data()?.storeIds as string[] | undefined) ?? [];
  for (const storeId of storeIds) {
    batch.set(db().collection('stores').doc(storeId), {
      accountId: accountRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
  return { id: accountRef.id, ...account };
}

export async function getEffectivePlan(uid: string, fallback: PlanTier): Promise<PlanTier> {
  const ent = await resolveEntitlements(uid);
  return ent?.plan ?? fallback;
}

export function accountSummaryForSettings(
  account: AccountRecord | null,
  entitlements: AccountEntitlements | null,
  settings: UserSettings,
) {
  return {
    accountId: account?.id,
    accountType: account?.accountType ?? settings.accountType,
    accountSetupComplete: !!settings.accountSetupComplete,
    billingStatus: entitlements?.billingStatus ?? 'monitor',
    billingExempt: entitlements?.billingExempt ?? true,
    companyName: account?.companyName,
    seatCount: entitlements?.seatCount ?? 1,
    includedSeats: entitlements?.includedSeats ?? 1,
    extraSeatMonthly: EXTRA_ACCOUNT_SEAT_MONTHLY,
    monthlyEstimate: entitlements?.monthlyEstimate ?? 0,
    paymentProvider: entitlements?.paymentProvider ?? null,
    paymentConfigured: !!entitlements?.paymentProvider || !!process.env.STRIPE_SECRET_KEY || !!process.env.PAYJP_SECRET_KEY,
  };
}
