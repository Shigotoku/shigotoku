import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  auth,
  onAuthChanged,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  resolveGoogleRedirect,
  formatAuthError,
  type User,
} from "../lib/firebase";
import { loginDemo, logoutDemo, isLoggedIn as isDemoLoggedIn, loadSettings } from "../lib/demoStore";
import { beginOrgMembership, type UserMembership } from "../lib/org";
import { publishAppBaseToExtension, publishAuthToExtension } from "../lib/extensionBridge";
import { clearSessionTouch, isSessionExpired, touchSession } from "../lib/session";

type AuthMode = "loading" | "google" | "demo" | "guest";

interface AuthCtx {
  user: User | null;
  mode: AuthMode;
  ready: boolean;
  error: string | null;
  membership: UserMembership | null;
  membershipReady: boolean;
  signInGoogle: () => Promise<User | null>;
  signInEmail: (email: string, password: string) => Promise<User | null>;
  signUpEmail: (email: string, password: string) => Promise<User | null>;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  refreshMembership: () => Promise<UserMembership | null>;
  applyMembership: (m: UserMembership | null) => void;
  isAuthenticated: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AuthMode>("loading");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [membershipReady, setMembershipReady] = useState(false);
  const membershipLoadId = useRef(0);

  const applyMembership = (m: UserMembership | null) => {
    membershipLoadId.current += 1;
    setMembership(m);
    setMembershipReady(true);
  };

  const loadMembership = async (u: User | null) => {
    const id = ++membershipLoadId.current;
    if (!u) {
      setMembership(null);
      setMembershipReady(true);
      return null;
    }
    setMembershipReady(false);
    try {
      const m = await beginOrgMembership(u);
      if (id !== membershipLoadId.current) return m;
      setMembership(m);
      setMembershipReady(true);
      return m;
    } catch {
      if (id !== membershipLoadId.current) return null;
      setMembership(null);
      setMembershipReady(true);
      return null;
    }
  };

  useEffect(() => {
    resolveGoogleRedirect().catch(() => null);
    const unsub = onAuthChanged((u) => {
      setUser(u);
      if (u) {
        setMode("google");
        logoutDemo();
        touchSession();
        publishAppBaseToExtension();
        void publishAuthToExtension();
        void loadMembership(u);
      } else if (isDemoLoggedIn()) {
        const timeout = loadSettings().sessionTimeoutMinutes || 480;
        if (isSessionExpired(timeout)) {
          logoutDemo();
          clearSessionTouch();
          setMode("guest");
          setMembership(null);
          setMembershipReady(true);
        } else {
          setMode("demo");
          touchSession();
          setMembershipReady(true);
        }
      } else {
        setMode("guest");
        setMembership(null);
        setMembershipReady(true);
      }
      setReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (mode !== "demo" && mode !== "google") return;
    const onActivity = () => touchSession();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    const timer = window.setInterval(() => {
      const timeout = loadSettings().sessionTimeoutMinutes || 480;
      if (isSessionExpired(timeout)) {
        logoutDemo();
        clearSessionTouch();
        void signOutUser();
        setMode("guest");
        setUser(null);
        setMembership(null);
      }
    }, 60_000);
    const authTick = window.setInterval(() => {
      void publishAuthToExtension();
    }, 10 * 60_000);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.clearInterval(timer);
      window.clearInterval(authTick);
    };
  }, [mode]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      mode,
      ready,
      error,
      membership,
      membershipReady,
      isAuthenticated: mode === "google" || mode === "demo",
      applyMembership,
      async signInGoogle() {
        setError(null);
        try {
          const cred = await signInWithGoogle();
          touchSession();
          return cred?.user ?? auth.currentUser;
        } catch (e) {
          setError(formatAuthError(e));
          throw e;
        }
      },
      async signInEmail(email: string, password: string) {
        setError(null);
        try {
          const u = await signInWithEmail(email, password);
          touchSession();
          return u;
        } catch (e) {
          setError(formatAuthError(e));
          throw e;
        }
      },
      async signUpEmail(email: string, password: string) {
        setError(null);
        try {
          const u = await signUpWithEmail(email, password);
          touchSession();
          return u;
        } catch (e) {
          setError(formatAuthError(e));
          throw e;
        }
      },
      enterDemo() {
        loginDemo();
        touchSession();
        setMode("demo");
        setUser(null);
        setMembership(null);
        setMembershipReady(true);
        publishAppBaseToExtension();
      },
      async refreshMembership() {
        return loadMembership(user ?? auth.currentUser);
      },
      async signOut() {
        logoutDemo();
        clearSessionTouch();
        await signOutUser();
        setMembership(null);
        setMode("guest");
        void publishAuthToExtension();
      },
    }),
    [user, mode, ready, error, membership, membershipReady],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider required");
  return ctx;
}
