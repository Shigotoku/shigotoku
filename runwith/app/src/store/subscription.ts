import { create } from "zustand";
import { persist } from "zustand/middleware";
import { subscriptionService } from "../services/subscriptions";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  computeMonthlyTotal,
  computeSeatUsage,
  type SeatUsage,
} from "../lib/billing";

export type PlanTier = "free" | "growth" | "pro";

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free",
  growth: "Growth",
  pro: "Pro",
};

export const PLAN_PRICES: Record<PlanTier, number> = {
  free: 0,
  growth: 2980,
  pro: 9800,
};

export interface FeatureAccess {
  id: string;
  label: string;
  requiredPlan: PlanTier;
}

export const FEATURE_ACCESS: FeatureAccess[] = [
  { id: "journey", label: "ジャーニーマップ", requiredPlan: "free" },
  { id: "dashboard", label: "ダッシュボード", requiredPlan: "free" },
  { id: "incorporation", label: "会社設立ナビ", requiredPlan: "free" },
  { id: "notifications", label: "届出・手続きナビ", requiredPlan: "free" },
  { id: "bank", label: "銀行口座開設", requiredPlan: "free" },
  { id: "credit", label: "法人カード", requiredPlan: "free" },
  { id: "simulator-basic", label: "事業シミュレーション（基本）", requiredPlan: "free" },
  { id: "funding", label: "補助金・助成金検索", requiredPlan: "growth" },
  { id: "contracts", label: "契約書テンプレート", requiredPlan: "growth" },
  { id: "tax-calendar", label: "税務カレンダー", requiredPlan: "growth" },
  { id: "pitch", label: "ピッチ資料作成", requiredPlan: "growth" },
  { id: "ip-management", label: "知財管理", requiredPlan: "growth" },
  { id: "labor", label: "労務ガイド", requiredPlan: "growth" },
  { id: "kpi-tracker", label: "KPIトラッカー", requiredPlan: "growth" },
  { id: "simulator-advanced", label: "事業シミュレーション（高度）", requiredPlan: "pro" },
  { id: "valuation", label: "企業価値評価", requiredPlan: "pro" },
  { id: "so-simulator", label: "SOシミュレーション", requiredPlan: "pro" },
  { id: "investor", label: "投資家マッチング", requiredPlan: "pro" },
  { id: "dd-preparation", label: "DD対策", requiredPlan: "pro" },
  { id: "ipo-roadmap", label: "IPOロードマップ", requiredPlan: "pro" },
  { id: "medical-mode", label: "医療モード", requiredPlan: "growth" },
  { id: "team-management", label: "チーム管理・招待", requiredPlan: "growth" },
];

const planLevel = (plan: PlanTier): number =>
  plan === "pro" ? 3 : plan === "growth" ? 2 : 1;

interface SubscriptionState {
  plan: PlanTier;
  medicalAddon: boolean;
  companyId: string | null;
  seatUsage: SeatUsage | null;
  monthlyTotal: number;
  loading: boolean;

  setPlan: (plan: PlanTier) => void;
  setMedicalAddon: (enabled: boolean) => void;
  canAccess: (featureId: string) => boolean;

  /** 現在選択中の会社のプラン・席数を取得 */
  fetchSubscription: (companyId: string | null) => Promise<void>;
  changePlan: (companyId: string, plan: PlanTier) => Promise<void>;
  toggleMedical: (companyId: string, enabled: boolean) => Promise<void>;
}

function applySubscriptionState(
  set: (partial: Partial<SubscriptionState>) => void,
  plan: PlanTier,
  medicalAddon: boolean,
  companyId: string | null,
  seatUsage: SeatUsage | null,
) {
  const occupied = seatUsage?.occupiedSeats ?? 1;
  set({
    plan,
    medicalAddon,
    companyId,
    seatUsage,
    monthlyTotal: computeMonthlyTotal(plan, occupied, medicalAddon),
  });
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plan: "free" as PlanTier,
      medicalAddon: false,
      companyId: null,
      seatUsage: null,
      monthlyTotal: 0,
      loading: false,

      setPlan: (plan) => {
        const { medicalAddon, seatUsage } = get();
        applySubscriptionState(
          set,
          plan,
          medicalAddon,
          get().companyId,
          seatUsage,
        );
      },
      setMedicalAddon: (enabled) => {
        const { plan, companyId, seatUsage } = get();
        applySubscriptionState(set, plan, enabled, companyId, seatUsage);
      },

      canAccess: (featureId: string) => {
        const feature = FEATURE_ACCESS.find((f) => f.id === featureId);
        if (!feature) return true;
        if (feature.id === "medical-mode") return get().medicalAddon;
        return planLevel(get().plan) >= planLevel(feature.requiredPlan);
      },

      fetchSubscription: async (companyId) => {
        if (!companyId || !isFirebaseConfigured) {
          applySubscriptionState(set, get().plan, get().medicalAddon, companyId, null);
          return;
        }

        set({ loading: true });
        try {
          const [sub, usageRaw] = await Promise.all([
            subscriptionService.fetchByCompany(companyId),
            subscriptionService.fetchSeatUsage(companyId),
          ]);

          const plan = (sub?.plan ?? "free") as PlanTier;
          const medicalAddon = sub?.medical_addon ?? false;
          const seatUsage = computeSeatUsage(
            usageRaw.memberCount,
            usageRaw.pendingInviteCount,
            plan,
          );

          applySubscriptionState(set, plan, medicalAddon, companyId, seatUsage);
        } finally {
          set({ loading: false });
        }
      },

      changePlan: async (companyId, plan) => {
        if (!isFirebaseConfigured) {
          applySubscriptionState(set, plan, get().medicalAddon, companyId, get().seatUsage);
          return;
        }

        set({ loading: true });
        try {
          const sub = await subscriptionService.updateCompanyPlan(companyId, plan);
          await get().fetchSubscription(companyId);
          set({ plan: sub.plan as PlanTier });
        } finally {
          set({ loading: false });
        }
      },

      toggleMedical: async (companyId, enabled) => {
        if (!isFirebaseConfigured) {
          applySubscriptionState(set, get().plan, enabled, companyId, get().seatUsage);
          return;
        }

        set({ loading: true });
        try {
          await subscriptionService.toggleCompanyMedicalAddon(companyId, enabled);
          await get().fetchSubscription(companyId);
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "runwith-subscription",
      partialize: (state) => ({
        plan: state.plan,
        medicalAddon: state.medicalAddon,
        companyId: state.companyId,
      }),
    }
  )
);
