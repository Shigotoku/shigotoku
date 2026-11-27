import type {
  BootstrapPayload,
  Capabilities,
  VideoVersion,
  Project,
  ReferenceItem,
  SourceFile,
  Style,
} from './types';

export const mockCapabilities: Capabilities = {
  driveFileAccess: false,
  picker: false,
  sharedDrive: false,
  videoPreview: false,
  videoRender: false,
  aiScript: false,
  organizationAdmin: true,
  advancedGeneration: true,
  auditLogging: false,
};

export const mockStyles: Style[] = [
  {
    id: 'style-company',
    organizationId: 'org-demo',
    kind: 'company',
    name: '会社公式ルール',
    description: 'ロゴ・色・フォント・CTA・禁止表現は固定',
    purpose: '採用・サービス紹介',
    audience: '求職者・見込み客',
  },
  {
    id: 'style-personal',
    organizationId: 'org-demo',
    kind: 'personal',
    name: '自分スタイル',
    description: '普段のトーン',
  },
  {
    id: 'style-recruit',
    organizationId: 'org-demo',
    kind: 'usecase',
    name: '採用広報',
    purpose: '採用',
    audience: '求職者',
  },
];

export const mockProjects: Project[] = [
  {
    id: 'proj-recruit',
    organizationId: 'org-demo',
    name: '採用ショート動画（サンプル）',
    styleId: 'style-company',
    templateId: 'tpl-recruit-25s',
    status: 'active',
    updatedAt: '2026-11-27T10:00:00Z',
  },
  {
    id: 'proj-notice',
    organizationId: 'org-demo',
    name: '年末年始のお知らせ',
    styleId: 'style-personal',
    templateId: 'tpl-notice-15s',
    status: 'draft',
    updatedAt: '2026-11-20T08:30:00Z',
  },
];

export const mockReferences: ReferenceItem[] = [
  {
    id: 'ref-1',
    name: '採用ショート動画（承認済み）',
    reason: '冒頭の写真構成と文字の見せ方が良い',
    approved: true,
  },
  {
    id: 'ref-2',
    name: 'サービス紹介 20秒版',
    reason: 'CTA の置き方のルール',
    approved: true,
  },
];

export const mockSources: Record<string, SourceFile[]> = {
  'proj-recruit': [
    {
      id: 'src-1',
      projectId: 'proj-recruit',
      name: '職場風景_01.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 820_000,
      addedAt: '2026-11-26T12:00:00Z',
    },
    {
      id: 'src-2',
      projectId: 'proj-recruit',
      name: '募集要項メモ.txt',
      mimeType: 'text/plain',
      sizeBytes: 3_200,
      addedAt: '2026-11-26T12:05:00Z',
    },
  ],
  'proj-notice': [],
};

export const mockVideo: VideoVersion = {
  id: 'video-1',
  projectId: 'proj-recruit',
  name: '採用ショート動画 v1',
  version: 1,
  aspect: '9:16',
  totalDurationSec: 25,
  scenes: [
    { index: 0, title: '私たちと働きませんか', subtitle: '写真3枚で職場を紹介', durationSec: 5 },
    { index: 1, title: '仕事の内容', subtitle: '本文を段階的に表示', durationSec: 8 },
    { index: 2, title: '働く環境', subtitle: '数字と一言で伝える', durationSec: 7 },
    { index: 3, title: 'ご応募はこちら', subtitle: 'CTA と問い合わせ先', durationSec: 5 },
  ],
};
export function buildMockBootstrap(): BootstrapPayload {
  return {
    requestId: `req_mock_${Date.now()}`,
    capabilities: mockCapabilities,
    user: {
      id: 'user-demo',
      email: 'demo@example.com',
      displayName: 'デモユーザー',
    },
    organization: {
      id: 'org-demo',
      name: 'サンプル株式会社（デモ）',
      type: 'company',
      plan: 'pro',
    },
    driveNavigation: null,
    projects: mockProjects,
    styles: mockStyles,
    references: mockReferences,
    activeProjectId: 'proj-recruit',
    activeStyleId: 'style-company',
    warnings: ['保存先は未接続です（モックモード）。設定から後で接続できます。'],
  };
}
