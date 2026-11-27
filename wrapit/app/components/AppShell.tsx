'use client';

import { Composer } from '@/components/Composer';
import { PreviewPane } from '@/components/PreviewPane';
import { Sidebar } from '@/components/Sidebar';
import { StatusBar } from '@/components/StatusBar';
import { StudioModals } from '@/components/StudioModals';

export function AppShell() {
  return (
    <div data-testid="app-shell" className="flex h-screen flex-col">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1">
          <Composer />
          <PreviewPane />
        </div>
      </div>
      <StatusBar />
      <StudioModals />
    </div>
  );
}
