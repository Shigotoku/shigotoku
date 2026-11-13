import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setTokenProvider } from "@/lib/aiClient";
import {
  formatAuthError,
  getIdToken,
  isFirebaseConfigured,
  onAuthChanged,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  type User,
} from "@/lib/firebase";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  configured: boolean;
  error: string;
  clearError: () => void;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTokenProvider(getIdToken);
    return onAuthChanged((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const run = async (fn: () => Promise<void>) => {
      setError("");
      try {
        await fn();
      } catch (e) {
        setError(formatAuthError(e));
      }
    };
    return {
      user,
      ready,
      configured: isFirebaseConfigured,
      error,
      clearError: () => setError(""),
      signInGoogle: () => run(signInWithGoogle),
      signInEmail: (email, password) => run(() => signInWithEmail(email, password)),
      signUpEmail: (email, password) => run(() => signUpWithEmail(email, password)),
      resetPassword: async (email) => {
        setError("");
        try {
          await sendPasswordReset(email);
          return true;
        } catch (e) {
          setError(formatAuthError(e));
          return false;
        }
      },
      signOut,
    };
  }, [user, ready, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider が必要です");
  return v;
}
