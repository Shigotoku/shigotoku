'use client';

import { useAuth } from '@/lib/auth-context';
import { isMockDataMode } from '@/lib/config';
import { isFirebaseClientConfigured } from '@/lib/firebase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { user, loading, authError, mockMode, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // リダイレクトログインは別ページ遷移。ポップアップ成功時は onAuthStateChanged → useEffect で / へ
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user') {
        setError('ログインをキャンセルしました。');
      } else {
        setError((e as Error).message);
      }
      setBusy(false);
    }
  };

  const showDemo = mockMode || isMockDataMode();

  const displayError = error ?? authError;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--side)] px-6 text-center text-white"
      data-testid="login-page"
    >
      <div className="space-y-2">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">DeckIt</h1>
        <p className="text-2xl font-medium text-[var(--accent-soft)] sm:text-3xl">資料、できた。</p>
      </div>
      <p className="max-w-lg text-lg text-[#c8d4dc] sm:text-xl">
        {showDemo
          ? 'モックモードではログインなしで UI を試せます。Firebase 設定後は Google ログインが必須になります。'
          : 'Google アカウントでログインしてください。'}
      </p>

      {loading && !user ? (
        <p className="text-base text-[#9fb0bc]">ログイン処理中…</p>
      ) : null}

      {!mockMode && isFirebaseClientConfigured ? (
        <button
          type="button"
          data-testid="login-google"
          disabled={busy || loading}
          className="rounded-lg bg-white px-8 py-3 text-base font-semibold text-[var(--side)] shadow-md disabled:opacity-50"
          onClick={() => void handleGoogle()}
        >
          Google でログイン
        </button>
      ) : null}

      {showDemo ? (
        <Link
          href="/"
          data-testid="login-continue"
          className="rounded-md bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-2)]"
        >
          デモを続ける
        </Link>
      ) : null}

      {displayError ? <p className="max-w-md text-sm text-red-300">{displayError}</p> : null}
    </div>
  );
}
