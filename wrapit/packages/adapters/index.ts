export { MockDriveProvider } from './mock-drive';
export { MockRenderProvider } from './mock-render';

/** 本番実装（Storage / レンダラー）は後続フェーズ（サーバー側のみ） */
export type AdapterMode = 'mock' | 'live';
