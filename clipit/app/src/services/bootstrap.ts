import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import type { ClipitOrganization, ClipitUserProfile } from '../types';

export async function ensureUserBootstrapped(user: User): Promise<ClipitUserProfile> {
  const userRef = doc(db, 'clipit_users', user.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    await updateDoc(userRef, { lastLoginAt: serverTimestamp() });
    return { uid: user.uid, ...existing.data() } as ClipitUserProfile;
  }

  const orgRef = doc(collection(db, 'clipit_organizations'));
  const orgId = orgRef.id;
  const displayName = user.displayName?.trim() || user.email?.split('@')[0] || 'わたしの会社';

  const batch = writeBatch(db);
  batch.set(orgRef, {
    name: displayName,
    type: 'smb',
    plan: 'free',
    onboardingCompleted: false,
    orgVariables: {
      会社名: displayName,
      問い合わせ先: '',
      受付時間: '平日 9:00〜18:00',
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(orgRef, 'members', user.uid), {
    role: 'owner',
    email: user.email ?? '',
    name: displayName,
    joinedAt: serverTimestamp(),
  });
  batch.set(userRef, {
    organizationId: orgId,
    name: displayName,
    email: user.email ?? '',
    role: 'owner',
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });
  await batch.commit();

  return {
    uid: user.uid,
    organizationId: orgId,
    name: displayName,
    email: user.email ?? '',
    role: 'owner',
  };
}

export async function getOrganization(orgId: string): Promise<ClipitOrganization | null> {
  const snap = await getDoc(doc(db, 'clipit_organizations', orgId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ClipitOrganization;
}

export async function updateOrganizationName(orgId: string, name: string) {
  await updateDoc(doc(db, 'clipit_organizations', orgId), {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateOrganizationLogo(orgId: string, logoUrl: string) {
  await updateDoc(doc(db, 'clipit_organizations', orgId), {
    logoUrl,
    updatedAt: serverTimestamp(),
  });
}

export async function updateOrganizationGlossary(orgId: string, termGlossary: string[]) {
  await updateDoc(doc(db, 'clipit_organizations', orgId), {
    termGlossary,
    updatedAt: serverTimestamp(),
  });
}

export async function updateOrganizationContent(
  orgId: string,
  patch: {
    orgVariables?: Record<string, string>;
    snippets?: Array<{ id: string; name: string; body: string }>;
    rulebook?: string;
  },
) {
  await updateDoc(doc(db, 'clipit_organizations', orgId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function updateOrganizationNotifyEmails(orgId: string, notifyEmails: string[]) {
  await updateDoc(doc(db, 'clipit_organizations', orgId), {
    notifyEmails,
    updatedAt: serverTimestamp(),
  });
}

export async function completeOrganizationSetup(
  orgId: string,
  input: { name: string; type: ClipitOrganization['type']; ownerName: string },
) {
  await updateDoc(doc(db, 'clipit_organizations', orgId), {
    name: input.name.trim(),
    type: input.type,
    onboardingCompleted: true,
    orgVariables: {
      会社名: input.name.trim(),
      問い合わせ先: '',
      受付時間: '平日 9:00〜18:00',
    },
    updatedAt: serverTimestamp(),
  });
}
