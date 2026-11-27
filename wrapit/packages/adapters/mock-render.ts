import type { SceneThumbnailRef, RenderProvider } from '@wrapit/domain';

export class MockRenderProvider implements RenderProvider {
  async createVideoFromPlan(): Promise<{ jobId: string }> {
    return { jobId: 'mock-job' };
  }

  async getThumbnails(): Promise<SceneThumbnailRef[]> {
    return [
      { index: 0, title: 'シーン 1' },
      { index: 1, title: 'シーン 2' },
    ];
  }
}