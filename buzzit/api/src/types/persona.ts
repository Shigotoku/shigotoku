import type { PublishMode } from './schedule';

export type PersonaType = 'official' | 'personal' | 'character';
export type PersonaRole = 'owner' | 'editor' | 'approver' | 'viewer';
export type PersonaStatus = 'active' | 'archived';

/** SNS・ブランド設定（UserSettings からペルソナ単位に分離） */
export interface PersonaSnsSettings {
  brandProfile?: string;
  defaultPublishMode?: PublishMode;
  ayrshareProfileKey?: string;
  lineChannelSecret?: string;
  lineChannelAccessToken?: string;
  lineAdminUserId?: string;
  lineDestinationId?: string;
  metaAccessToken?: string;
  metaPageAccessToken?: string;
  metaIgUserId?: string;
  metaPageId?: string;
  metaTokenExpiresAt?: string;
  xApiKey?: string;
  xApiSecret?: string;
  xAccessToken?: string;
  xAccessSecret?: string;
  xUsername?: string;
  xApiPostsMonthKey?: string;
  xApiPostsThisMonth?: number;
  gbpConnected?: boolean;
  gbpLocationName?: string;
  gbpAccessToken?: string;
  gbpRefreshToken?: string;
  gbpTokenExpiresAt?: string;
  gbpAccountName?: string;
  gbpLocationId?: string;
  gbpLocationResourceName?: string;
  insightsEnabled?: boolean;
  xInsightsEnabled?: boolean;
  insightsLastSyncedAt?: string;
}

export interface PersonaRecord extends PersonaSnsSettings {
  id: string;
  name: string;
  slug: string;
  type: PersonaType;
  description?: string;
  avatarUrl?: string;
  brandSafetyLevel?: 'medical' | 'standard';
  ownerId: string;
  accountId?: string;
  status: PersonaStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface PersonaMemberRecord {
  userId: string;
  role: PersonaRole;
  email?: string;
  displayName?: string;
  createdAt: string;
}

export interface PersonaAuditLog {
  id: string;
  personaId: string;
  actorUid: string;
  action: string;
  detail?: string;
  createdAt: string;
}
