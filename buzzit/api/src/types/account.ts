import type { PlanTier } from '../services/firestore';

/** 個人 or 法人（課金・席数の単位） */
export type AccountType = 'individual' | 'business';

/** 課金ステータス */
export type BillingStatus = 'monitor' | 'trial' | 'active' | 'past_due' | 'cancelled';

/** 決済プロバイダ（Stripe / PAY.JP など） */
export type PaymentProviderId = 'stripe' | 'payjp';

export type BillingExemptType = 'monitor' | 'partner' | 'internal';

export type AccountMemberRole = 'owner' | 'admin' | 'member';

export interface AccountRecord {
  id: string;
  accountType: AccountType;
  billingStatus: BillingStatus;
  plan: PlanTier;

  /** 課金免除（モニター等） */
  billingExempt?: boolean;
  billingExemptType?: BillingExemptType;
  billingExemptReason?: string;
  billingExemptExpiresAt?: string;
  billingExemptGrantedBy?: string;

  /** 法人情報（business のみ） */
  companyName?: string;
  companyTaxId?: string;

  /** 席数: 含まれる席数（通常1）と現在のメンバー数 */
  includedSeats: number;
  seatCount: number;

  /** 決済プロバイダ連携（将来） */
  paymentProvider?: PaymentProviderId | null;
  paymentCustomerId?: string;

  ownerUid: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccountMemberRecord {
  userId: string;
  role: AccountMemberRole;
  email?: string;
  displayName?: string;
  createdAt: string;
}

export interface AccountInvitationRecord {
  id: string;
  accountId: string;
  email: string;
  role: Exclude<AccountMemberRole, 'owner'>;
  token: string;
  invitedBy: string;
  inviterName?: string;
  companyName?: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface AccountEntitlements {
  accountId: string;
  accountType: AccountType;
  billingStatus: BillingStatus;
  plan: PlanTier;
  chargeable: boolean;
  billingExempt: boolean;
  companyName?: string;
  seatCount: number;
  includedSeats: number;
  extraSeats: number;
  monthlyEstimate: number;
  paymentProvider?: PaymentProviderId | null;
}

export interface AccountSetupInput {
  accountType: AccountType;
  companyName?: string;
  companyTaxId?: string;
}

export interface AdminAccountPatch {
  billingStatus?: BillingStatus;
  plan?: PlanTier;
  billingExempt?: boolean;
  billingExemptType?: BillingExemptType;
  billingExemptReason?: string;
  billingExemptExpiresAt?: string | null;
  billingExemptGrantedBy?: string;
  companyName?: string;
  companyTaxId?: string;
  includedSeats?: number;
}
