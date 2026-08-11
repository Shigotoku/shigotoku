import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthChanged,
  signInWithGoogle,
  signInWithEmail,
  signOutUser,
  resolveGoogleRedirect,
  formatAuthError,
  type User,
} from "../lib/firebase";
import { loginDemo, logoutDemo, isLoggedIn as isDemoLoggedIn, loadSettings } from "../lib/demoStore";
import { ensureOrgMembership, beginOrgMembership } from "../lib/org";
import { publishAppBaseToExtension } from "../lib/extensionBridge";
import { clearSessionTouch, isSessionExpired, touchSession } from "../lib/session";

type AuthMode = "loading" | "google" | "demo" | "guest";

interface AuthCtx {
  user: User | null;
  mode: AuthMode;
  ready: boolean;
  error: string | null;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AuthMode>("loading");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    resolveGoogleRedirect().catch(() => null);
    unsub = onAuthChanged((u) => {
      setUser(u);
      if (u) {
        setMode("google");
        logoutDemo();
        touchSession();
        publishAppBaseToExtension();
        beginOrgMembership(u);
      } else if (isDemoLoggedIn()) {
        const timeout = loadSettings().sessionTimeoutMinutes || 480;
        if (isSessionExpired(timeout)) {
          logoutDemo();
          clearSessionTouch();
          setMode("guest");
        } else {
          setMode("demo");
          touchSession();
        }
      } else {
        setMode("guest");
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
      }
    }, 60_000);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.clearInterval(timer);
    };
  }, [mode]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      mode,
      ready,
      error,
      isAuthenticated: mode === "google" || mode === "demo",
      async signInGoogle() {
        setError(null);
        try {
          await signInWithGoogle();
          touchSession();
        } catch (e) {
          setError(formatAuthError(e));
        }
      },
      async signInEmail(email: string, password: string) {
        setError(null);
        try {
          await signInWithEmail(email, password);
          touchSession();
        } catch (e) {
          setError(formatAuthError(e));
        }
      },
      enterDemo() {
        loginDemo();
        touchSession();
        setMode("demo");
        setUser(null);
        publishAppBaseToExtension();
      },
      async signOut() {
        logoutDemo();
        clearSessionTouch();
        await signOutUser();
        setMode("guest");
      },
    }),
    [user, mode, ready, error],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider required");
  return ctx;
}
