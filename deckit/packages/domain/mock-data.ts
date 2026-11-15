import type {
  BootstrapPayload,
  Capabilities,
  DeckVersion,
  Project,
  ReferenceItem,
  SourceFile,
  Style,
} from './types';

export const mockCapabilities: Capabilities = {
  driveFileAccess: false,
  picker: false,
  sharedDrive: false,
  slidesRead: false,
  slidesWrite: false,
  nativeGeminiSlides: false,
  organizationAdmin: true,
  advancedGeneration: true,
  auditLogging: false,
};

export const mockStyles: Style[] = [
  {
    id: 'style-company',
    organizationId: 'org-demo',
    kind: 'company',
    name: '会社公式',
    description: 'ロゴ・色・免責は固定',
    purpose: '営業提案',
    audience: '医療機関の経営層',
  },
  {
    id: 'style-personal',
    organizationId: 'org-demo',
    kind: 'personal',
    name: '自分スタイル',
    description: '普段のトーン',
  },
  {
    id: 'style-vc',
    organizationId: 'org-demo',
    kind: 'usecase',
    name: 'VC・投資家向け',
    purpose: '資金調達',
    audience: '投資家',
  },
];

export const mockProjects: Project[] = [
  {
    id: 'proj-onboarding',
    organizationId: 'org-demo',
    name: '院内DX提案（サンプル）',
    styleId: 'style-company',
    status: 'active',
    updatedAt: '2026-09-28T10:00:00Z',
  },
  {
    id: 'proj-q4',
    organizationId: 'org-demo',
    name: 'Q4 事業報告',
    styleId: 'style-personal',
    status: 'draft',
    updatedAt: '2026-09-20T08:30:00Z',
  },
];

export const mockReferences: ReferenceItem[] = [
  {
    id: 'ref-1',
    name: '2025 営業デック（完成版）',
    reason: '構成とチャートのバランスが良い',
    approved: true,
  },
  {
    id: 'ref-2',
    name: '学会発表スライド',
    reason: '文献表記のルール',
    approved: true,
  },
];

export const mockSources: Record<string, SourceFile[]> = {
  'proj-onboarding': [
    {
      id: 'src-1',
      projectId: 'proj-onboarding',
      name: '提案骨子.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 420_000,
      addedAt: '2026-09-27T12:00:00Z',
    },
    {
      id: 'src-2',
      projectId: 'proj-onboarding',
      name: '導入事例メモ.txt',
      mimeType: 'text/plain',
      sizeBytes: 8_400,
      addedAt: '2026-09-27T12:05:00Z',
    },
  ],
  'proj-q4': [],
};

export const mockDeck: DeckVersion = {
  id: 'deck-1',
  projectId: 'proj-onboarding',
  name: '院内DX提案 v1',
  version: 1,
  slides: [
    { index: 0, title: '院内DXのご提案', subtitle: 'MediToku クリニック向け' },
    { index: 1, title: '現状の課題', subtitle: '待ち時間・記録業務・人材' },
    { index: 2, title: '解決アプローチ', subtitle: '段階導入とROI' },
    { index: 3, title: '導入ステップ', subtitle: '3ヶ月パイロット' },
    { index: 4, title: '次のアクション', subtitle: 'ヒアリング日程のご相談' },
  ],
};

export function buildMockBootstrap(): BootstrapPayload {
  return {
    requestId: `req_mock_${Date.now()}`,
    capabilities: mockCapabilities,
    user: {
      id: 'user-demo',
      email: 'demo@meditoku.example',
      displayName: 'デモユーザー',
    },
    organization: {
      id: 'org-demo',
      name: 'メディトク商事（デモ）',
      type: 'company',
      plan: 'pro',
    },
    driveNavigation: null,
    projects: mockProjects,
    styles: mockStyles,
    references: mockReferences,
    activeProjectId: 'proj-onboarding',
    activeStyleId: 'style-company',
    warnings: ['Drive は未接続です（モックモード）。設定から後で接続できます。'],
  };
}
