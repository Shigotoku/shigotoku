import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

export const subscriptionService = {
  /** ログイン中ユーザー自身のサブスクリプションを取得 */
  async fetchByUser(userId: string): Promise<SubscriptionRow | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as SubscriptionRow;
  },

  async updatePlan(
    userId: string,
    plan: "free" | "growth" | "pro"
  ): Promise<SubscriptionRow> {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { data, error } = await supabase
      .from("subscriptions")
      .update({ plan } as any)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data as SubscriptionRow;
  },

  async toggleMedicalAddon(
    userId: string,
    enabled: boolean
  ): Promise<SubscriptionRow> {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { data, error } = await supabase
      .from("subscriptions")
      .update({ medical_addon: enabled } as any)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data as SubscriptionRow;
  },
};
