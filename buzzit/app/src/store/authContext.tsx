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
import { auth, getIdToken, signInDemo, signInWithGoogle, isFirebaseConfigured } from '../lib/firebase';
import { bootstrapAuth, setAuthTokenGetter } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signInGoogle: () => Promise<void>;
  signInDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(getIdToken);
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await bootstrapAuth(u.email ?? undefined, u.displayName ?? undefined);
        } catch {
          // bootstrap optional on first load
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInGoogle = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signInDemoHandler = useCallback(async () => {
    await signInDemo();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isConfigured: isFirebaseConfigured,
      signInGoogle,
      signInDemo: signInDemoHandler,
      logout,
    }),
    [user, loading, signInGoogle, signInDemoHandler, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
