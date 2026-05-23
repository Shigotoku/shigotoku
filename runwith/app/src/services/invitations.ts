import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

/** トークン生成: 32文字のランダム16進数 */
function generateToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const invitationService = {
  /** 招待を送信（メール送信は Supabase Edge Function または外部サービスで行う想定） */
  async invite(
    companyId: string,
    email: string,
    role: "admin" | "member" | "viewer"
  ): Promise<{ token: string; inviteUrl: string }> {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("未認証");

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日後

    const { error } = await supabase.from("invitations").insert({
      company_id: companyId,
      invited_by: session.user.id,
      email,
      role,
      token,
      expires_at: expiresAt.toISOString(),
    } as any);

    if (error) {
      if (error.code === "23505") throw new Error("このメールアドレスには既に招待を送信しています");
      throw error;
    }

    const inviteUrl = `${window.location.origin}/invite/${token}`;
    return { token, inviteUrl };
  },

  /** 招待一覧を取得 */
  async fetchByCompany(companyId: string): Promise<InvitationRow[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as InvitationRow[];
  },

  /** 招待をトークンで参照（ログイン不要） */
  async fetchByToken(token: string): Promise<{
    companyName: string;
    inviterEmail: string;
    role: string;
    expired: boolean;
  } | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from("invitations")
      .select("*, companies(name), profiles!invited_by(email)")
      .eq("token", token)
      .single();

    if (error || !data) return null;

    const row = data as any;
    const expired =
      row.accepted_at !== null || new Date(row.expires_at) < new Date();

    return {
      companyName: row.companies?.name ?? "不明な会社",
      inviterEmail: row.profiles?.email ?? "",
      role: row.role,
      expired,
    };
  },

  /** 招待を承認（DB関数経由） */
  async accept(token: string): Promise<{ companyId: string; role: string }> {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { data, error } = await (supabase.rpc as any)("accept_invitation", {
      p_token: token,
    });
    if (error) throw error;

    const result = data as { success?: boolean; error?: string; company_id?: string; role?: string };
    if (result.error) throw new Error(result.error);

    return { companyId: result.company_id!, role: result.role! };
  },

  /** 招待を取り消す */
  async revoke(invitationId: string): Promise<void> {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", invitationId);
    if (error) throw error;
  },
};
