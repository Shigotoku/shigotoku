export { MockDriveProvider } from './mock-drive';
export { MockSlidesProvider } from './mock-slides';

/** 本番 Drive API 実装は Phase C-2（サーバー側のみ） */
export type GoogleAdapterMode = 'mock' | 'live';
