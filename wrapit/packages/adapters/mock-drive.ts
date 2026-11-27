import type { DriveFolderRef, DriveProvider } from '@wrapit/domain';

export class MockDriveProvider implements DriveProvider {
  async ensureWorkspace(): Promise<DriveFolderRef> {
    return { id: 'mock-workspace', name: 'WrapIt', url: '#' };
  }

  async createProjectFolder(projectName: string): Promise<DriveFolderRef> {
    return {
      id: `mock-project-${Date.now()}`,
      name: projectName,
      url: '#',
    };
  }
}
