import { isFirebaseConfigured } from '../lib/firebase';
import {
  fetchSubscription,
  updateSubscriptionPlan,
  toggleMedicalAddon,
} from '../lib/firestore';
import type { Database } from '../lib/database.types';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];

export const subscriptionService = {
  async fetchByUser(userId: string): Promise<SubscriptionRow | null> {
    if (!isFirebaseConfigured) return null;
    return fetchSubscription(userId);
  },

  async updatePlan(userId: string, plan: 'free' | 'growth' | 'pro'): Promise<SubscriptionRow> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    return updateSubscriptionPlan(userId, plan);
  },

  async toggleMedicalAddon(userId: string, enabled: boolean): Promise<SubscriptionRow> {
    if (!isFirebaseConfigured) throw new Error('Firebase未設定');
    return toggleMedicalAddon(userId, enabled);
  },
};
