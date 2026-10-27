export type StoreRole = 'owner' | 'manager' | 'staff';

export const ROLE_LABELS: Record<StoreRole, string> = {
  owner: 'オーナー',
  manager: '管理者',
  staff: 'スタッフ',
};

export function canManageMembers(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager';
}

export function canManageBilling(role: string | null | undefined): boolean {
  return role === 'owner';
}

export function canRemoveMember(
  actorRole: string | null | undefined,
  targetRole: string,
  actorUserId: string,
  targetUserId: string,
): boolean {
  if (actorUserId === targetUserId) return false;
  if (targetRole === 'owner') return false;
  return actorRole === 'owner' || actorRole === 'manager';
}

export function canChangeMemberRole(
  actorRole: string | null | undefined,
  targetRole: string,
  actorUserId: string,
  targetUserId: string,
): boolean {
  if (actorUserId === targetUserId) return false;
  if (targetRole === 'owner') return false;
  if (actorRole === 'owner') return true;
  if (actorRole === 'manager') return targetRole === 'staff';
  return false;
}

export function canTransferOwnership(actorRole: string | null | undefined): boolean {
  return actorRole === 'owner';
}

export function assignableRoles(actorRole: string | null | undefined): Exclude<StoreRole, 'owner'>[] {
  if (actorRole === 'owner') return ['manager', 'staff'];
  if (actorRole === 'manager') return ['staff'];
  return [];
}

/** スタッフはネタ投稿・下書き中心。店長/オーナーは承認・配信・設定 */
export function canApprovePosts(role: string | null | undefined): boolean {
  return role == null || role === 'owner' || role === 'manager';
}

export function canManageLineCrm(role: string | null | undefined): boolean {
  return role == null || role === 'owner' || role === 'manager';
}

export function canEditSettings(role: string | null | undefined): boolean {
  return role == null || role === 'owner' || role === 'manager';
}

export function canPublishBroadcast(role: string | null | undefined): boolean {
  return role == null || role === 'owner' || role === 'manager';
}

export function canSubmitIdeas(_role: string | null | undefined): boolean {
  return true;
}

export function isStaffOnly(role: string | null | undefined): boolean {
  return role === 'staff';
}
