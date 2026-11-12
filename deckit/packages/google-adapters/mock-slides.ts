import type { SlideThumbnailRef, SlidesProvider } from '@deckit/domain';

export class MockSlidesProvider implements SlidesProvider {
  async createDeckFromPlan(): Promise<{ fileId: string; url: string }> {
    return { fileId: 'mock-deck', url: 'https://docs.google.com/presentation/d/mock' };
  }

  async getThumbnails(): Promise<SlideThumbnailRef[]> {
    return [
      { index: 0, title: 'スライド 1' },
      { index: 1, title: 'スライド 2' },
    ];
  }
}
