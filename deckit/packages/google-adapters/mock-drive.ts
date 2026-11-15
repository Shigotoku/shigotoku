import type { DriveFolderRef, DriveProvider } from '@deckit/domain';

export class MockDriveProvider implements DriveProvider {
  async ensureWorkspace(): Promise<DriveFolderRef> {
    return { id: 'mock-workspace', name: 'DeckIt', url: '#' };
  }

  async createProjectFolder(projectName: string): Promise<DriveFolderRef> {
    return {
      id: `mock-project-${Date.now()}`,
      name: projectName,
      url: '#',
    };
  }
}
