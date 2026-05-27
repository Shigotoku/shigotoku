import { isFirebaseConfigured } from '../lib/firebase';
import {
  fetchSubscription,
  fetchCompanySubscription,
  updateSubscriptionPlan,
  updateCompanySubscriptionPlan,
  toggleMedicalAddon,
  toggleCompanyMedicalAddon,
  countCompanySeatUsage,
} from '../lib/firestore';
import type { Database } from '../lib/database.types';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];

export const subscriptionService = {
  async fetchByUser(userId: string): Promise<SubscriptionRow | null> {
    if (!isFirebaseConfigured) return null;
    return fetchSubscription(userId);
  },

  async fetchByCompany(companyId: string): Promise<SubscriptionRow | null> {
    if (!isFirebaseConfigured) return null;
    return fetchCompanySubscription(companyId);
  },

  async fetchSeatUsage(companyId: string) {
    if (!isFirebaseConfigured) {
      return { memberCount: 1, pendingInviteCount: 0 };
    }
    return countCompanySeatUsage(companyId);
  },

  async updatePlan(userId: string, plan: 'free' | 'growth' | 'pro'): Promise<SubscriptionRow> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    return updateSubscriptionPlan(userId, plan);
  },

  async updateCompanyPlan(
    companyId: string,
    plan: 'free' | 'growth' | 'pro',
  ): Promise<SubscriptionRow> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    return updateCompanySubscriptionPlan(companyId, plan);
  },

  async toggleMedicalAddon(userId: string, enabled: boolean): Promise<SubscriptionRow> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    return toggleMedicalAddon(userId, enabled);
  },

  async toggleCompanyMedicalAddon(
    companyId: string,
    enabled: boolean,
  ): Promise<SubscriptionRow> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    return toggleCompanyMedicalAddon(companyId, enabled);
  },
};
