export type CompanyRole = 'owner' | 'admin' | 'member' | 'viewer';

export function canManageMembers(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageBilling(role: string | null | undefined): boolean {
  return role === 'owner';
}

export function canEditCompanySettings(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export const ROLE_LABELS: Record<CompanyRole, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
  viewer: '閲覧者',
};

const MANAGEABLE_ROLES: CompanyRole[] = ['admin', 'member', 'viewer'];

export function canRemoveMember(
  actorRole: string | null | undefined,
  targetRole: string,
  actorUserId: string,
  targetUserId: string,
): boolean {
  if (actorUserId === targetUserId) return false;
  if (targetRole === 'owner') return false;
  return actorRole === 'owner' || actorRole === 'admin';
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
  if (actorRole === 'admin') {
    return MANAGEABLE_ROLES.includes(targetRole as CompanyRole);
  }
  return false;
}

export function canTransferOwnership(actorRole: string | null | undefined): boolean {
  return actorRole === 'owner';
}

export function assignableRoles(actorRole: string | null | undefined): CompanyRole[] {
  if (actorRole === 'owner') return ['admin', 'member', 'viewer'];
  if (actorRole === 'admin') return ['admin', 'member', 'viewer'];
  return [];
}
