'use client';

import { isMockDataMode } from '@/lib/config';
import {
  getFirebaseAuth,
  getGoogleProvider,
  isFirebaseClientConfigured,
} from '@/lib/firebase/client';
import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  mockMode: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const mockMode = isMockDataMode();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!mockMode);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (mockMode || !isFirebaseClientConfigured) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    let unsubscribe = () => {};

    void (async () => {
      setLoading(true);
      try {
        await setPersistence(auth, browserLocalPersistence);
        await getRedirectResult(auth);
      } catch (err) {
        const msg = (err as Error).message || 'ログインに失敗しました';
        setAuthError(msg);
      }
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u) setAuthError(null);
        setLoading(false);
      });
    })();

    return () => unsubscribe();
  }, [mockMode]);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseClientConfigured) {
      throw new Error('Firebase が未設定です');
    }
    const auth = getFirebaseAuth();
    const provider = getGoogleProvider();
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const preferPopup =
      host === 'localhost' || host.endsWith('.run.app') || host.endsWith('.shigotoku.com');

    if (preferPopup) {
      try {
        await signInWithPopup(auth, provider);
        return;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'auth/popup-closed-by-user') throw err;
        if (code !== 'auth/popup-blocked' && code !== 'auth/cancelled-popup-request') {
          throw err;
        }
      }
    }

    await signInWithRedirect(auth, provider);
  }, []);

  const signOutUser = useCallback(async () => {
    if (mockMode || !isFirebaseClientConfigured) return;
    await signOut(getFirebaseAuth());
  }, [mockMode]);

  const value = useMemo(
    () => ({ user, loading, authError, mockMode, signInWithGoogle, signOutUser }),
    [user, loading, authError, mockMode, signInWithGoogle, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
