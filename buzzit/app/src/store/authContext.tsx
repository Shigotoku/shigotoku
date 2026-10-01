import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  auth,
  getIdToken,
  signInDemo,
  signInWithGoogle,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  resetPasswordEmail,
  resolveGoogleRedirect,
  isFirebaseConfigured,
  formatAuthError,
  resolveAuthError,
  type LoginHintSuggest,
} from '../lib/firebase';
import { bootstrapAuth, fetchLoginHint, setAuthTokenGetter } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  submitting: boolean;
  isConfigured: boolean;
  authError: string | null;
  loginHint: LoginHintSuggest | null;
  clearAuthError: () => void;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function syncUserProfile(u: User) {
  void bootstrapAuth(u.email || undefined, u.displayName || undefined).catch(() => {
    // API 未接続でもログイン自体は継続
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginHint, setLoginHint] = useState<LoginHintSuggest | null>(null);

  useEffect(() => {
    setAuthTokenGetter(getIdToken);
    if (!isFirebaseConfigured) {
      setInitializing(false);
      return;
    }

    let mounted = true;

    // 保存済みセッションを最優先で復元（待ち時間を最小化）
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!mounted) return;
      setUser(u);
      if (u) {
        setAuthError(null);
        setLoginHint(null);
        syncUserProfile(u);
      }
      setInitializing(false);
    });

    // Google リダイレクト復帰はバックグラウンド処理
    void resolveGoogleRedirect()
      .then((result) => {
        if (!mounted || !result?.user) return;
        setUser(result.user);
        syncUserProfile(result.user);
      })
      .catch(() => {});

    return () => {
      mounted = false;
      unsubAuth();
    };
  }, []);

  const runAuthAction = useCallback(async (action: () => Promise<void>) => {
    setAuthError(null);
    setLoginHint(null);
    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      setAuthError(formatAuthError(err));
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setLoginHint(null);
    setSubmitting(true);
    try {
      const cred = await signInWithEmailPassword(email, password);
      setUser(cred.user);
      syncUserProfile(cred.user);
    } catch (err) {
      const resolved = await resolveAuthError(err, email, fetchLoginHint);
      setAuthError(resolved.message);
      setLoginHint(resolved.hint ?? null);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    setAuthError(null);
    setLoginHint(null);
    setSubmitting(true);
    try {
      const cred = await signUpWithEmailPassword(email, password, displayName);
      setUser(cred.user);
      syncUserProfile(cred.user);
    } catch (err) {
      const resolved = await resolveAuthError(err, email, fetchLoginHint);
      setAuthError(resolved.message);
      setLoginHint(resolved.hint ?? null);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string) => {
      await runAuthAction(async () => {
        await resetPasswordEmail(email);
      });
    },
    [runAuthAction],
  );

  const signInGoogle = useCallback(async () => {
    await runAuthAction(async () => {
      await signInWithGoogle();
      if (auth.currentUser) {
        setUser(auth.currentUser);
        syncUserProfile(auth.currentUser);
      }
    });
  }, [runAuthAction]);

  const signInDemoHandler = useCallback(async () => {
    await runAuthAction(async () => {
      const cred = await signInDemo();
      setUser(cred.user);
      syncUserProfile(cred.user);
    });
  }, [runAuthAction]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setLoginHint(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      submitting,
      isConfigured: isFirebaseConfigured,
      authError,
      loginHint,
      clearAuthError,
      signInEmail,
      signUpEmail,
      resetPassword,
      signInGoogle,
      signInDemo: signInDemoHandler,
      logout,
    }),
    [
      user,
      initializing,
      submitting,
      authError,
      loginHint,
      clearAuthError,
      signInEmail,
      signUpEmail,
      resetPassword,
      signInGoogle,
      signInDemoHandler,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
