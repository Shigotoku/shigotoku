export type StyleKind = 'company' | 'personal' | 'usecase';

export type ProjectStatus = 'draft' | 'active' | 'archived';

export type ComposerStep = 1 | 2 | 3 | 4;

export interface Capabilities {
  driveFileAccess: boolean;
  picker: boolean;
  sharedDrive: boolean;
  slidesRead: boolean;
  slidesWrite: boolean;
  nativeGeminiSlides: boolean;
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

export interface SlideThumbnail {
  index: number;
  title: string;
  subtitle?: string;
}

export interface DeckVersion {
  id: string;
  projectId: string;
  name: string;
  version: number;
  driveUrl?: string;
  slides: SlideThumbnail[];
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
