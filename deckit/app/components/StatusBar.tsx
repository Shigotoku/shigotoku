'use client';

import { useStudio } from '@/lib/studio-context';

export function StatusBar() {
  const { statusMessage, loadingBootstrap, bootstrapError, refreshBootstrap } = useStudio();

  return (
    <footer
      data-testid="status-bar"
      className="flex items-center gap-2 border-t border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--muted)]"
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          bootstrapError ? 'bg-amber-500' : loadingBootstrap ? 'bg-gray-400' : 'bg-emerald-500'
        }`}
        aria-hidden
      />
      <span data-testid="status-text">{statusMessage}</span>
      {bootstrapError ? (
        <button
          type="button"
          data-testid="retry-bootstrap"
          className="ml-auto text-[var(--accent)]"
          onClick={() => void refreshBootstrap()}
        >
          再読み込み
        </button>
      ) : null}
    </footer>
  );
}
