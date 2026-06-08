import type { Timestamp } from 'firebase/firestore';

export type OrgType = 'clinic' | 'smb' | 'startup' | 'developer' | 'agency';
export type PlanId = 'free' | 'light' | 'standard' | 'business' | 'developer' | 'agency';
export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type ManualStatus = 'draft' | 'published' | 'archived';
export type TargetAudience = 'new_staff' | 'admin' | 'patient' | 'customer' | 'developer';
export type StepType = 'normal' | 'warning' | 'ng_example' | 'check';

export type MaskStyle = 'black' | 'blur' | 'pixelate';

export interface MaskRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: MaskStyle;
}

export interface StepAnnotation {
  id: string;
  kind: 'circle' | 'text' | 'arrow';
  /** 位置（%）— 円・テキストは中心/左上、矢印は始点 */
  x: number;
  y: number;
  /** 円の直径（%） */
  size?: number;
  text?: string;
  /** 矢印の終点（%） */
  endX?: number;
  endY?: number;
}

export type ManualCreationSource = 'extension' | 'talk' | 'screenshot' | 'template' | 'demo';
export type ContentType = 'manual' | 'material';

export interface OrgSnippet {
  id: string;
  name: string;
  body: string;
}

export interface ClipitOrganization {
  id: string;
  name: string;
  type: OrgType;
  plan: PlanId;
  logoUrl?: string;
  /** 話して作成・AI整形時の用語補正（1行1語） */
  termGlossary?: string[];
  /** {{キー}} 形式で全マニュアルに展開 */
  orgVariables?: Record<string, string>;
  /** 共通パーツ（{{snippet:id}} で埋め込み） */
  snippets?: OrgSnippet[];
  /** 社内ルールブック（AI一括更新・文体統一の参照） */
  rulebook?: string;
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
  creationSource?: ManualCreationSource;
  contentType?: ContentType;
  editionLabel?: string;
  /** 一括更新後に既読をリセットするための版番号 */
  confirmationVersion?: number;
  parentManualId?: string;
  /** フォルダ未設定は null / 未設定 */
  folderId?: string | null;
}

export interface ManualFolder {
  id: string;
  organizationId: string;
  name: string;
  sortOrder: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FolderManualSnapshot {
  manualId: string;
  title: string;
  steps: ShareStepSnapshot[];
  confirmationVersion: number;
}

export interface FolderShareTokenDoc {
  folderId: string;
  organizationId: string;
  folderName: string;
  manuals: FolderManualSnapshot[];
  expiresAt: Timestamp | null;
  watermark?: boolean;
  updateNotice?: string;
  createdAt?: Timestamp;
  refreshedAt?: Timestamp;
  createdBy: string;
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
  elementRole?: string;
  /** ビューポートに対するクリック位置（0–100%） */
  clickX?: number;
  clickY?: number;
  masks?: MaskRect[];
  annotations?: StepAnnotation[];
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
  confirmationVersion?: number;
  updateNotice?: string;
  createdAt?: Timestamp;
  createdBy: string;
}

export type FeedbackType = 'unclear' | 'screen_differs' | 'wrong' | 'request_update';

export interface ReadConfirmationInput {
  viewerName: string;
  viewerEmail?: string;
}
