import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface SignUpResult {
  needsEmailVerification: boolean;
  userId?: string;
}

export const authService = {
  async signUp(
    email: string,
    password: string,
    fullName: string
  ): Promise<SignUpResult> {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw error;

    return {
      needsEmailVerification: !data.session,
      userId: data.user?.id,
    };
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async getSession() {
    if (!isSupabaseConfigured) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  async getProfile(userId: string): Promise<ProfileRow | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data as ProfileRow;
  },

  async updateProfile(
    userId: string,
    updates: { full_name?: string; avatar_url?: string }
  ): Promise<ProfileRow> {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    return data as ProfileRow;
  },

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ) {
    if (!isSupabaseConfigured)
      return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },
};
