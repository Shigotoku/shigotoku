import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];
type MemberRow = Database["public"]["Tables"]["company_members"]["Row"];

export const companyService = {
  async fetchUserCompanies(userId: string): Promise<CompanyRow[]> {
    if (!isSupabaseConfigured) return [];

    const { data: memberships, error: mErr } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", userId);
    if (mErr) throw mErr;
    if (!memberships?.length) return [];

    const companyIds = (memberships as { company_id: string }[]).map(
      (m) => m.company_id
    );
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .in("id", companyIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CompanyRow[];
  },

  async createCompany(
    userId: string,
    companyData: CompanyInsert
  ): Promise<CompanyRow> {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { data, error } = await supabase.rpc("create_company_with_member", {
      p_name: (companyData as any).name ?? "",
      p_name_kana: (companyData as any).name_kana ?? "",
      p_industry: (companyData as any).industry ?? "",
      p_phase: (companyData as any).phase ?? "idea",
      p_is_medical_mode: (companyData as any).is_medical_mode ?? false,
      p_medical_fields: (companyData as any).medical_fields ?? [],
      p_founded_date: (companyData as any).founded_date ?? null,
      p_postal_code: (companyData as any).postal_code ?? "",
      p_address: (companyData as any).address ?? "",
      p_representative_name: (companyData as any).representative_name ?? "",
      p_capital_amount: (companyData as any).capital_amount ?? 0,
      p_employee_count: (companyData as any).employee_count ?? 1,
      p_description: (companyData as any).description ?? "",
    });

    if (error) throw error;

    const result = data as any;
    if (result?.error) throw new Error(result.error);

    return result as CompanyRow;
  },

  async updateCompany(
    companyId: string,
    updates: CompanyUpdate
  ): Promise<CompanyRow> {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { data, error } = await supabase
      .from("companies")
      .update(updates as any)
      .eq("id", companyId)
      .select()
      .single();
    if (error) throw error;
    return data as CompanyRow;
  },

  async deleteCompany(companyId: string) {
    if (!isSupabaseConfigured) throw new Error("Supabase未設定");

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId);
    if (error) throw error;
  },

  async fetchMembers(
    companyId: string
  ): Promise<
    (MemberRow & {
      profile?: { full_name: string | null; email: string };
    })[]
  > {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from("company_members")
      .select("*, profiles(full_name, email)")
      .eq("company_id", companyId)
      .order("created_at");
    if (error) throw error;

    return ((data as any[]) ?? []).map((m: any) => ({
      ...m,
      profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
    }));
  },

  async getUserRole(
    companyId: string,
    userId: string
  ): Promise<string | null> {
    if (!isSupabaseConfigured) return "owner";

    const { data, error } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .single();
    if (error) return null;
    return (data as { role: string }).role;
  },
};
