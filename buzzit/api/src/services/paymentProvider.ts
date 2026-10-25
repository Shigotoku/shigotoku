/**
 * 決済プロバイダ抽象化 — Stripe / PAY.JP どちらでも接続可能にする
 */
import type { PaymentProviderId } from '../types/account';

export interface PaymentCustomerInput {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface PaymentCustomerResult {
  provider: PaymentProviderId;
  customerId: string;
}

/** 環境変数から有効なプロバイダを判定（未設定なら null） */
export function getActivePaymentProvider(): PaymentProviderId | null {
  if (process.env.STRIPE_SECRET_KEY) return 'stripe';
  if (process.env.PAYJP_SECRET_KEY) return 'payjp';
  return null;
}

export function isPaymentConfigured(): boolean {
  return getActivePaymentProvider() !== null;
}

/** Stripe Customer 作成 */
async function createStripeCustomer(input: PaymentCustomerInput): Promise<PaymentCustomerResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY が未設定です');

  const params = new URLSearchParams({
    email: input.email,
    ...(input.name ? { name: input.name } : {}),
  });
  for (const [k, v] of Object.entries(input.metadata ?? {})) {
    params.set(`metadata[${k}]`, v);
  }

  const res = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Stripe customer create failed: ${await res.text()}`);
  }

  const json = (await res.json()) as { id: string };
  return { provider: 'stripe', customerId: json.id };
}

/** PAY.JP Customer 作成 */
async function createPayjpCustomer(input: PaymentCustomerInput): Promise<PaymentCustomerResult> {
  const key = process.env.PAYJP_SECRET_KEY;
  if (!key) throw new Error('PAYJP_SECRET_KEY が未設定です');

  const res = await fetch('https://api.pay.jp/v1/customers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      description: input.name,
      metadata: input.metadata,
    }),
  });

  if (!res.ok) {
    throw new Error(`PAY.JP customer create failed: ${await res.text()}`);
  }

  const json = (await res.json()) as { id: string };
  return { provider: 'payjp', customerId: json.id };
}

/** 課金対象アカウント用に Customer を作成（モニター・免除はスキップ） */
export async function createPaymentCustomer(
  input: PaymentCustomerInput,
  preferredProvider?: PaymentProviderId,
): Promise<PaymentCustomerResult | null> {
  const provider = preferredProvider ?? getActivePaymentProvider();
  if (!provider) return null;

  switch (provider) {
    case 'stripe':
      return createStripeCustomer(input);
    case 'payjp':
      return createPayjpCustomer(input);
    default:
      return null;
  }
}
