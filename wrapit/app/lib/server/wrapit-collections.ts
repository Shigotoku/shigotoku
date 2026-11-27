/** Firestore コレクション名（WrapIt / 他プロダクトと衝突しない prefix） */
export const COL = {
  users: 'wrapit_users',
  organizations: 'wrapit_organizations',
  memberships: 'wrapit_memberships',
  projects: 'wrapit_projects',
  styles: 'wrapit_styles',
  references: 'wrapit_references',
  googleConnections: 'wrapit_google_connections',
  idempotency: 'wrapit_idempotency',
} as const;
