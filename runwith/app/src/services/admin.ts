import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  plan: string;
  company_name: string;
  companies_count: number;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_companies: number;
  new_users_this_week: number;
  plan_breakdown: { free: number; growth: number; pro: number };
}

const DEMO_USERS: AdminUser[] = [
  {
    id: "u1",
    email: "tanaka@example.com",
    full_name: "田中 太郎",
    plan: "free",
    company_name: "テック株式会社",
    companies_count: 1,
    created_at: "2026-03-20T09:00:00Z",
  },
  {
    id: "u2",
    email: "yamada@startup.co.jp",
    full_name: "山田 花子",
    plan: "growth",
    company_name: "スタートアップAI株式会社",
    companies_count: 1,
    created_at: "2026-03-21T11:30:00Z",
  },
  {
    id: "u3",
    email: "suzuki@medtech.jp",
    full_name: "鈴木 一郎",
    plan: "pro",
    company_name: "メドテック株式会社",
    companies_count: 2,
    created_at: "2026-03-22T14:00:00Z",
  },
  {
    id: "u4",
    email: "ito@fintech.com",
    full_name: "伊藤 さくら",
    plan: "growth",
    company_name: "フィンテックラボ合同会社",
    companies_count: 1,
    created_at: "2026-03-23T10:00:00Z",
  },
  {
    id: "u5",
    email: "watanabe@hrtech.jp",
    full_name: "渡辺 健太",
    plan: "free",
    company_name: "HRテック合同会社",
    companies_count: 1,
    created_at: "2026-03-24T16:00:00Z",
  },
];

const DEMO_STATS: AdminStats = {
  total_users: 5,
  total_companies: 6,
  new_users_this_week: 5,
  plan_breakdown: { free: 2, growth: 2, pro: 1 },
};

export async function fetchAdminStats(): Promise<AdminStats> {
  if (!isSupabaseConfigured) return DEMO_STATS;

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [profilesRes, companiesRes, subsRes] = await Promise.all([
      (supabase as any).from("profiles").select("id, created_at"),
      (supabase as any).from("companies").select("id"),
      (supabase as any).from("subscriptions").select("plan"),
    ]);

    const profiles: any[] = profilesRes.data ?? [];
    const companies: any[] = companiesRes.data ?? [];
    const subs: any[] = subsRes.data ?? [];

    const breakdown = { free: 0, growth: 0, pro: 0 };
    subs.forEach((s) => {
      if (s.plan === "free") breakdown.free++;
      else if (s.plan === "growth") breakdown.growth++;
      else if (s.plan === "pro") breakdown.pro++;
    });

    return {
      total_users: profiles.length,
      total_companies: companies.length,
      new_users_this_week: profiles.filter(
        (p) => new Date(p.created_at) > oneWeekAgo
      ).length,
      plan_breakdown: breakdown,
    };
  } catch {
    return DEMO_STATS;
  }
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured) return DEMO_USERS;

  try {
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false });

    if (!profiles || profiles.length === 0) return [];

    const userIds = profiles.map((p: any) => p.id);

    const [subsRes, membersRes] = await Promise.all([
      (supabase as any)
        .from("subscriptions")
        .select("user_id, plan")
        .in("user_id", userIds),
      (supabase as any)
        .from("company_members")
        .select("user_id, companies(name)")
        .in("user_id", userIds),
    ]);

    const subMap: Record<string, string> = {};
    (subsRes.data ?? []).forEach((s: any) => {
      subMap[s.user_id] = s.plan ?? "free";
    });

    const memberMap: Record<string, { name: string; count: number }> = {};
    (membersRes.data ?? []).forEach((m: any) => {
      if (!memberMap[m.user_id]) {
        memberMap[m.user_id] = { name: m.companies?.name ?? "-", count: 0 };
      }
      memberMap[m.user_id].count++;
    });

    return profiles.map((p: any) => ({
      id: p.id,
      email: p.email ?? "",
      full_name: p.full_name ?? "（未設定）",
      plan: subMap[p.id] ?? "free",
      company_name: memberMap[p.id]?.name ?? "-",
      companies_count: memberMap[p.id]?.count ?? 0,
      created_at: p.created_at,
    }));
  } catch {
    return DEMO_USERS;
  }
}
