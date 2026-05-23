import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "../services/auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { auditService } from "../services/audit";
import type { Database } from "../lib/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  isDemo: boolean;

  initialize: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ needsEmailVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (updates: { name?: string; avatarUrl?: string }) => Promise<void>;
  startDemo: (user: User) => void;

  /** @deprecated 後方互換性のため残置。signIn/startDemo を使用してください */
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loading: false,
      initialized: false,
      isDemo: false,

      initialize: async () => {
        if (get().initialized) return;

        if (!isSupabaseConfigured) {
          set({ initialized: true });
          return;
        }

        set({ loading: true });
        try {
          const session = await authService.getSession();
          if (session?.user) {
            const profile = await authService.getProfile(session.user.id) as ProfileRow | null;
            set({
              user: {
                id: session.user.id,
                email: session.user.email ?? "",
                name: profile?.full_name ?? "",
                avatarUrl: profile?.avatar_url ?? undefined,
              },
              isAuthenticated: true,
              isDemo: false,
            });
          }
        } catch {
          // セッション復元失敗は無視
        } finally {
          set({ loading: false, initialized: true });
        }

        authService.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_OUT" || !session) {
            set({ user: null, isAuthenticated: false, isDemo: false });
            return;
          }
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            try {
              const profile = await authService.getProfile(session.user.id) as ProfileRow | null;
              set({
                user: {
                  id: session.user.id,
                  email: session.user.email ?? "",
                  name: profile?.full_name ?? "",
                  avatarUrl: profile?.avatar_url ?? undefined,
                },
                isAuthenticated: true,
                isDemo: false,
              });
            } catch {
              // プロフィール取得失敗
            }
          }
        });
      },

      signUp: async (email, password, fullName) => {
        set({ loading: true });
        try {
          const result = await authService.signUp(email, password, fullName);
          return { needsEmailVerification: result.needsEmailVerification };
        } finally {
          set({ loading: false });
        }
      },

      signIn: async (email, password) => {
        set({ loading: true });
        try {
          const { user: authUser } = await authService.signIn(email, password);
          const profile = await authService.getProfile(authUser.id) as ProfileRow | null;
          set({
            user: {
              id: authUser.id,
              email: authUser.email ?? "",
              name: profile?.full_name ?? "",
              avatarUrl: profile?.avatar_url ?? undefined,
            },
            isAuthenticated: true,
            isDemo: false,
          });
          auditService.log({ action: "user.login" });
        } finally {
          set({ loading: false });
        }
      },

      signOut: async () => {
        set({ loading: true });
        try {
          auditService.log({ action: "user.logout" });
          await authService.signOut();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isDemo: false,
            loading: false,
          });
        }
      },

      resetPassword: async (email) => {
        set({ loading: true });
        try {
          await authService.resetPassword(email);
        } finally {
          set({ loading: false });
        }
      },

      updatePassword: async (password) => {
        set({ loading: true });
        try {
          await authService.updatePassword(password);
        } finally {
          set({ loading: false });
        }
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        set({ loading: true });
        try {
          await authService.updateProfile(user.id, {
            full_name: updates.name,
            avatar_url: updates.avatarUrl,
          });
          set({
            user: {
              ...user,
              name: updates.name ?? user.name,
              avatarUrl: updates.avatarUrl ?? user.avatarUrl,
            },
          });
        } finally {
          set({ loading: false });
        }
      },

      startDemo: (user) => {
        set({ user, isAuthenticated: true, isDemo: true });
      },

      login: (user) => set({ user, isAuthenticated: true, isDemo: true }),
      logout: () => set({ user: null, isAuthenticated: false, isDemo: false }),
    }),
    {
      name: "runwith-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isDemo: state.isDemo,
      }),
    }
  )
);
