/**
 * Google 固有処理のポート（実装は Phase C で `packages/google-adapters` へ）
 */

import type { DriveFolderRef } from './types';

export interface DriveProvider {
  ensureWorkspace(): Promise<DriveFolderRef>;
  createProjectFolder(projectName: string): Promise<DriveFolderRef>;
}

export interface SlideThumbnailRef {
  index: number;
  contentUrl?: string;
  title?: string;
}

export interface SlidesProvider {
  createDeckFromPlan(input: {
    projectFolderId: string;
    templateFileId?: string;
    planJson: unknown;
  }): Promise<{ fileId: string; url: string }>;
  getThumbnails(presentationId: string): Promise<SlideThumbnailRef[]>;
}
