/**
 * 外部サービス固有処理のポート。
 * 保存先は Firebase Storage を標準とし、Google Drive などは後から実装を追加する（ADR / docs/wrapit/DESIGN.md §4.4）。
 */

import type { DriveFolderRef } from './types';

export interface DriveProvider {
  ensureWorkspace(): Promise<DriveFolderRef>;
  createProjectFolder(projectName: string): Promise<DriveFolderRef>;
}

export interface SceneThumbnailRef {
  index: number;
  contentUrl?: string;
  title?: string;
}

/** 動画レンダリングのポート。実装方式（Remotion 等）は R0 の PoC 後に決定する。 */
export interface RenderProvider {
  createVideoFromPlan(input: {
    projectId: string;
    templateId?: string;
    planJson: unknown;
  }): Promise<{ jobId: string }>;
  getThumbnails(jobId: string): Promise<SceneThumbnailRef[]>;
}