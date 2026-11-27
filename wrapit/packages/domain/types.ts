export type StyleKind = 'company' | 'personal' | 'usecase';

export type ProjectStatus = 'draft' | 'active' | 'archived';

/** 動画の縦横比（初期は縦動画 9:16 のみ） */
export type AspectRatio = '9:16' | '1:1' | '16:9';

export type ComposerStep = 1 | 2 | 3 | 4;

export interface Capabilities {
  driveFileAccess: boolean;
  picker: boolean;
  sharedDrive: boolean;
  videoPreview: boolean;
  videoRender: boolean;
  aiScript: boolean;
  organizationAdmin: boolean;
  advancedGeneration: boolean;
  auditLogging: boolean;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  type: 'personal' | 'company';
  plan: 'free' | 'pro' | 'team';
}

export interface DriveFolderRef {
  id: string;
  name: string;
  url?: string;
}

export interface DriveNavigation {
  workspace: DriveFolderRef;
  projectRoot?: DriveFolderRef;
  templateRoot?: DriveFolderRef;
  assetRoot?: DriveFolderRef;
  referenceRoot?: DriveFolderRef;
  styleRoot?: DriveFolderRef;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  styleId?: string;
  templateId?: string;
  status: ProjectStatus;
  driveFolderId?: string;
  driveUrl?: string;
  updatedAt: string;
}

export interface Style {
  id: string;
  organizationId: string;
  kind: StyleKind;
  name: string;
  description?: string;
  purpose?: string;
  audience?: string;
  driveUrl?: string;
}

export interface SourceFile {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  addedAt: string;
}

export interface ReferenceItem {
  id: string;
  name: string;
  reason?: string;
  approved: boolean;
  driveUrl?: string;
}

/** 動画の1シーン（DeckIt のスライド1枚に相当）。時間・位置はテンプレートが決める */
export interface SceneCard {
  index: number;
  title: string;
  subtitle?: string;
  durationSec: number;
}

export interface VideoVersion {
  id: string;
  projectId: string;
  name: string;
  version: number;
  driveUrl?: string;
  scenes: SceneCard[];
  totalDurationSec: number;
  aspect: AspectRatio;
}

export interface BootstrapPayload {
  requestId: string;
  capabilities: Capabilities;
  user: UserSummary;
  organization: OrganizationSummary;
  driveNavigation: DriveNavigation | null;
  projects: Project[];
  styles: Style[];
  references: ReferenceItem[];
  activeProjectId: string | null;
  activeStyleId: string | null;
  warnings: string[];
}
