import type { Timestamp } from 'firebase/firestore';

export type OrgType = 'clinic' | 'smb' | 'startup' | 'developer' | 'agency';
export type PlanId = 'free' | 'light' | 'standard' | 'business' | 'developer' | 'agency';
export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type ManualStatus = 'draft' | 'published' | 'archived';
export type TargetAudience = 'new_staff' | 'admin' | 'patient' | 'customer' | 'developer';
export type StepType = 'normal' | 'warning' | 'ng_example' | 'check';

export interface MaskRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'black' | 'blur' | 'pixelate';
}

export interface ClipitOrganization {
  id: string;
  name: string;
  type: OrgType;
  plan: PlanId;
  logoUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ClipitUserProfile {
  uid: string;
  organizationId: string;
  name: string;
  email: string;
  role: MemberRole;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface ClipitMember {
  uid: string;
  role: MemberRole;
  email: string;
  name: string;
  joinedAt?: Timestamp;
}

export interface Manual {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: string;
  targetAudience: TargetAudience[];
  status: ManualStatus;
  version: number;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  stepCount?: number;
  readCount?: number;
  expiresAt?: Timestamp;
}

export interface ManualStep {
  id: string;
  order: number;
  type: StepType;
  title: string;
  instruction: string;
  note: string;
  screenshotUrl: string;
  pageTitle: string;
  pageUrl: string;
  elementText: string;
  /** ビューポートに対するクリック位置（0–100%） */
  clickX?: number;
  clickY?: number;
  masks?: MaskRect[];
}

export interface ShareStepSnapshot {
  order: number;
  type: StepType;
  title: string;
  instruction: string;
  note: string;
  screenshotUrl: string;
  clickX?: number;
  clickY?: number;
}

export interface ShareTokenDoc {
  manualId: string;
  organizationId: string;
  title: string;
  steps: ShareStepSnapshot[];
  expiresAt: Timestamp | null;
  watermark?: boolean;
  createdAt?: Timestamp;
  createdBy: string;
}

export type FeedbackType = 'unclear' | 'screen_differs' | 'wrong' | 'request_update';

export interface ReadConfirmationInput {
  viewerName: string;
  viewerEmail?: string;
}
