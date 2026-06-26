import { apiFetch } from '../lib/api';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ClipitMember, MemberRole } from '../types';

export async function listOrgMembers(orgId: string): Promise<ClipitMember[]> {
  const snap = await getDocs(collection(db, 'clipit_organizations', orgId, 'members'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as ClipitMember);
}

export async function updateMemberRole(orgId: string, memberUid: string, role: MemberRole): Promise<void> {
  await apiFetch(`/v1/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberUid)}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(orgId: string, memberUid: string): Promise<void> {
  await apiFetch(`/v1/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberUid)}`, {
    method: 'DELETE',
  });
}

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'オーナー',
  admin: '管理者',
  editor: '編集者',
  viewer: '閲覧のみ',
};
