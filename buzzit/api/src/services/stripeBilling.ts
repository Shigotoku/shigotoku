/**
 * Stripe Checkout / Webhook（REST API 直叩き — シークレットは Secret Manager）
 */
import type { PlanTier } from './firestore';
import { PLAN_BASE_MONTHLY } from './billing';

const STRIPE_API = 'https://api.stripe.com/v1';

function stripeKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY;
}

function formEncode(data: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) params.set(k, String(v));
  }
  return params.toString();
}

export function isStripeConfigured(): boolean {
  return !!stripeKey();
}

/** 年払い: 2ヶ月分無料（10ヶ月分請求） */
export function annualAmountJpy(plan: PlanTier): number {
  const monthly = PLAN_BASE_MONTHLY[plan];
  if (!monthly) return 0;
  return monthly * 10;
}

const PLAN_PRICE_LABEL: Partial<Record<PlanTier, string>> = {
  line_lite: 'BuzzIt LINE CRM Lite',
  line_pro: 'BuzzIt LINE CRM Pro',
  starter: 'BuzzIt Starter',
  pro: 'BuzzIt Pro',
  growth: 'BuzzIt Growth OS',
};

/** 創業3年未満スタートアップ割引 30%OFF */
export function applyStartupDiscount(amount: number, startupDiscount?: boolean): number {
  if (!startupDiscount) return amount;
  return Math.round(amount * 0.7);
}

export async function createCheckoutSession(input: {
  uid: string;
  email?: string;
  plan: PlanTier;
  interval: 'monthly' | 'annual';
  successUrl: string;
  cancelUrl: string;
  referralCode?: string;
  startupDiscount?: boolean;
}): Promise<{ sessionId: string; url: string } | null> {
  const key = stripeKey();
  if (!key) return null;

  const monthly = PLAN_BASE_MONTHLY[input.plan];
  if (!monthly) return null;

  let amount = input.interval === 'annual' ? annualAmountJpy(input.plan) : monthly;
  amount = applyStartupDiscount(amount, input.startupDiscount);
  const label = PLAN_PRICE_LABEL[input.plan] ?? `BuzzIt ${input.plan}`;
  const discountNote = input.startupDiscount ? '（スタートアップ割引30%OFF）' : '';

  const body = formEncode({
    mode: 'payment',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.email,
    'line_items[0][price_data][currency]': 'jpy',
    'line_items[0][price_data][unit_amount]': amount,
    'line_items[0][price_data][product_data][name]': `${label}（${input.interval === 'annual' ? '年払い' : '月払い'}）${discountNote}`,
    'line_items[0][quantity]': 1,
    'metadata[uid]': input.uid,
    'metadata[plan]': input.plan,
    'metadata[interval]': input.interval,
    ...(input.referralCode ? { 'metadata[referralCode]': input.referralCode } : {}),
  });

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    console.error('Stripe checkout failed', await res.text());
    return null;
  }

  const json = (await res.json()) as { id?: string; url?: string };
  if (!json.id || !json.url) return null;
  return { sessionId: json.id, url: json.url };
}

export function verifyStripeWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const crypto = require('crypto') as typeof import('crypto');
  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const ts = parts.t;
  const sig = parts.v1;
  if (!ts || !sig) return false;
  const signed = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
  return signed === sig;
}
