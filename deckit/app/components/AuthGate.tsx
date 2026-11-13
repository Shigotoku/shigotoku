'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, mockMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !mockMode && !user) {
      router.replace('/login');
    }
  }, [loading, mockMode, user, router]);

  if (loading && !mockMode) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-sm text-[var(--muted)]">
        読み込み中…
      </div>
    );
  }

  if (!mockMode && !user) {
    return null;
  }

  return children;
}
