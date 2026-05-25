import { isFirebaseConfigured } from '../lib/firebase';
import {
  fetchUserCompanies,
  createCompanyWithMember,
  updateCompanyDoc,
  deleteCompanyDoc,
  fetchCompanyMembers,
  getUserRoleInCompany,
} from '../lib/firestore';
import type { Database } from '../lib/database.types';

type CompanyRow = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];
type MemberRow = Database['public']['Tables']['company_members']['Row'];

export const companyService = {
  async fetchUserCompanies(userId: string): Promise<CompanyRow[]> {
    if (!isFirebaseConfigured) return [];
    return fetchUserCompanies(userId);
  },

  async createCompany(userId: string, companyData: CompanyInsert): Promise<CompanyRow> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    return createCompanyWithMember(userId, companyData);
  },

  async updateCompany(companyId: string, updates: CompanyUpdate): Promise<CompanyRow> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    return updateCompanyDoc(companyId, updates);
  },

  async deleteCompany(companyId: string) {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    await deleteCompanyDoc(companyId);
  },

  async fetchMembers(
    companyId: string,
  ): Promise<(MemberRow & { profile?: { full_name: string | null; email: string } })[]> {
    if (!isFirebaseConfigured) return [];
    return fetchCompanyMembers(companyId);
  },

  async getUserRole(companyId: string, userId: string): Promise<string | null> {
    if (!isFirebaseConfigured) return 'owner';
    return getUserRoleInCompany(companyId, userId);
  },
};
