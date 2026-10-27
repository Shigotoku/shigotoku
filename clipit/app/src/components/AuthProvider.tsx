import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isFirebaseConfigured, onAuthChanged, resolveGoogleRedirect, type User } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Firebase 未設定（デモモード）かどうか */
  demoMode: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, demoMode: !isFirebaseConfigured });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    resolveGoogleRedirect().catch(() => undefined);
    const unsub = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, demoMode: !isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}
