import { isFirebaseConfigured } from '../lib/firebase';
import {
  fetchAllProfilesForAdmin,
  fetchAllCompaniesForAdmin,
  fetchAllSubscriptionsForAdmin,
  COL,
} from '../lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    id: 'u1',
    email: 'tanaka@example.com',
    full_name: '田中 太郎',
    plan: 'free',
    company_name: 'テック株式会社',
    companies_count: 1,
    created_at: '2026-03-20T09:00:00Z',
  },
  {
    id: 'u2',
    email: 'yamada@startup.co.jp',
    full_name: '山田 花子',
    plan: 'growth',
    company_name: 'スタートアップAI株式会社',
    companies_count: 1,
    created_at: '2026-03-21T11:30:00Z',
  },
  {
    id: 'u3',
    email: 'suzuki@medtech.jp',
    full_name: '鈴木 一郎',
    plan: 'pro',
    company_name: 'メドテック株式会社',
    companies_count: 2,
    created_at: '2026-03-22T14:00:00Z',
  },
  {
    id: 'u4',
    email: 'ito@fintech.com',
    full_name: '伊藤 さくら',
    plan: 'growth',
    company_name: 'フィンテックラボ合同会社',
    companies_count: 1,
    created_at: '2026-03-23T10:00:00Z',
  },
  {
    id: 'u5',
    email: 'watanabe@hrtech.jp',
    full_name: '渡辺 健太',
    plan: 'free',
    company_name: 'HRテック合同会社',
    companies_count: 1,
    created_at: '2026-03-24T16:00:00Z',
  },
];

const DEMO_STATS: AdminStats = {
  total_users: 5,
  total_companies: 6,
  new_users_this_week: 5,
  plan_breakdown: { free: 2, growth: 2, pro: 1 },
};

async function firstCompanyName(userId: string): Promise<{ name: string; count: number }> {
  const userSnap = await getDoc(doc(db, COL.users, userId));
  if (!userSnap.exists()) return { name: '-', count: 0 };
  const ids: string[] = userSnap.data().company_ids ?? [];
  if (!ids.length) return { name: '-', count: 0 };
  const snap = await getDoc(doc(db, COL.companies, ids[0]!));
  return { name: snap.exists() ? (snap.data().name ?? '-') : '-', count: ids.length };
}

export async function fetchAdminStats(): Promise<AdminStats> {
  if (!isFirebaseConfigured) return DEMO_STATS;

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [profiles, companies, subs] = await Promise.all([
      fetchAllProfilesForAdmin(),
      fetchAllCompaniesForAdmin(),
      fetchAllSubscriptionsForAdmin(),
    ]);

    const breakdown = { free: 0, growth: 0, pro: 0 };
    subs.forEach((s) => {
      if (s.plan === 'free') breakdown.free++;
      else if (s.plan === 'growth') breakdown.growth++;
      else if (s.plan === 'pro') breakdown.pro++;
    });

    return {
      total_users: profiles.length,
      total_companies: companies.length,
      new_users_this_week: profiles.filter((p) => new Date(p.created_at) > oneWeekAgo).length,
      plan_breakdown: breakdown,
    };
  } catch {
    return DEMO_STATS;
  }
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  if (!isFirebaseConfigured) return DEMO_USERS;

  try {
    const profiles = await fetchAllProfilesForAdmin();
    if (!profiles.length) return [];

    const subs = await fetchAllSubscriptionsForAdmin();
    const subMap: Record<string, string> = {};
    subs.forEach((s) => {
      subMap[s.user_id] = s.plan ?? 'free';
    });

    const users: AdminUser[] = [];
    for (const p of profiles) {
      const { name, count } = await firstCompanyName(p.id);
      users.push({
        id: p.id,
        email: p.email ?? '',
        full_name: p.full_name ?? '（未設定）',
        plan: subMap[p.id] ?? 'free',
        company_name: name,
        companies_count: count,
        created_at: p.created_at,
      });
    }
    return users;
  } catch {
    return DEMO_USERS;
  }
}
