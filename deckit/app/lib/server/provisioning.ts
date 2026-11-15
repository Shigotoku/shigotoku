import { COL } from '@/lib/server/deckit-collections';
import { adminDb } from '@/lib/server/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

const STARTER_STYLES = [
  { kind: 'company', name: '会社公式', description: 'ロゴ・色・免責は固定' },
  { kind: 'personal', name: '自分スタイル', description: '普段のトーン' },
  { kind: 'usecase', name: 'VC・投資家向け', description: '資金調達向け構成' },
] as const;

export interface ProvisionedUser {
  userId: string;
  organizationId: string;
  personalOrganizationId: string;
}

export async function ensureUserProvisioned(token: DecodedIdToken): Promise<ProvisionedUser> {
  const db = adminDb();
  const userRef = db.collection(COL.users).doc(token.uid);
  const snap = await userRef.get();

  if (snap.exists) {
    const data = snap.data()!;
    return {
      userId: token.uid,
      organizationId: (data.activeOrganizationId as string) ?? (data.personalOrganizationId as string),
      personalOrganizationId: data.personalOrganizationId as string,
    };
  }

  const personalOrgId = `org_personal_${token.uid}`;
  const now = FieldValue.serverTimestamp();

  const batch = db.batch();

  batch.set(db.collection(COL.organizations).doc(personalOrgId), {
    name: token.name?.trim() || '個人ワークスペース',
    type: 'personal',
    ownerUserId: token.uid,
    plan: 'free',
    createdAt: now,
    updatedAt: now,
  });

  const membershipId = `${personalOrgId}_${token.uid}`;
  batch.set(db.collection(COL.memberships).doc(membershipId), {
    organizationId: personalOrgId,
    userId: token.uid,
    role: 'owner',
    status: 'active',
    createdAt: now,
  });

  batch.set(userRef, {
    email: token.email ?? '',
    displayName: token.name ?? '',
    photoUrl: token.picture ?? '',
    personalOrganizationId: personalOrgId,
    activeOrganizationId: personalOrgId,
    status: 'active',
    createdAt: now,
    lastLoginAt: now,
  });

  for (const s of STARTER_STYLES) {
    const styleId = `style_${personalOrgId}_${s.kind}`;
    batch.set(db.collection(COL.styles).doc(styleId), {
      organizationId: personalOrgId,
      ownerUserId: token.uid,
      visibility: s.kind === 'personal' ? 'private' : 'organization',
      kind: s.kind,
      name: s.name,
      description: s.description,
      referenceIds: [],
      rules: [],
      lockedRules: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();

  return {
    userId: token.uid,
    organizationId: personalOrgId,
    personalOrganizationId: personalOrgId,
  };
}
