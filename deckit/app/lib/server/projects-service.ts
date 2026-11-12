import { COL } from '@/lib/server/deckit-collections';
import { adminDb } from '@/lib/server/firebase-admin';
import { ApiError } from '@/lib/server/request-auth';
import type { Project } from '@deckit/domain';
import { FieldValue } from 'firebase-admin/firestore';

export async function createProject(input: {
  organizationId: string;
  ownerUserId: string;
  name: string;
  styleId?: string;
}): Promise<Project> {
  const db = adminDb();
  const ref = db.collection(COL.projects).doc();
  const now = FieldValue.serverTimestamp();

  await ref.set({
    organizationId: input.organizationId,
    ownerUserId: input.ownerUserId,
    name: input.name.trim(),
    styleId: input.styleId ?? null,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: ref.id,
    organizationId: input.organizationId,
    name: input.name.trim(),
    styleId: input.styleId,
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
}

export async function assertOrgMember(organizationId: string, userId: string) {
  const db = adminDb();
  const membershipId = `${organizationId}_${userId}`;
  const snap = await db.collection(COL.memberships).doc(membershipId).get();
  if (!snap.exists) {
    throw new ApiError('PERMISSION', 'この組織にアクセスできません', 403);
  }
}
