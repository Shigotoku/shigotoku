/** Firestore コレクション名（DeckIt / 他プロダクトと衝突しない prefix） */
export const COL = {
  users: 'deckit_users',
  organizations: 'deckit_organizations',
  memberships: 'deckit_memberships',
  projects: 'deckit_projects',
  styles: 'deckit_styles',
  references: 'deckit_references',
  googleConnections: 'deckit_google_connections',
  idempotency: 'deckit_idempotency',
} as const;
