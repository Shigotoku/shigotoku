import {
  collection,
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
import { db } from '../lib/firebase';
import type { MemberRole } from '../types';

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

export async function createInvitation(input: {
  organizationId: string;
  email: string;
  role: MemberRole;
  createdBy: string;
}): Promise<{ token: string; url: string }> {
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

  const orgId = inv.organizationId;
  await setDoc(doc(db, 'clipit_organizations', orgId, 'members', uid), {
    role: inv.role,
    email: userEmail,
    name: displayName,
    joinedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'clipit_users', uid), {
    organizationId: orgId,
    email: userEmail,
    name: displayName,
    role: inv.role,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'clipit_invitations', token), {
    acceptedAt: serverTimestamp(),
  });
  return orgId;
}
