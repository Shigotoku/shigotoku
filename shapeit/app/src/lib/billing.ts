export type PlanId = "free" | "team" | "scale";

export interface BillingState {
  plan: PlanId;
}

const KEY = "shapeit:billing:v1";

export function loadBilling(): BillingState {
  try {
    return { plan: "team", ...JSON.parse(localStorage.getItem(KEY) || "{}") } as BillingState;
  } catch {
    return { plan: "team" };
  }
}

export function saveBilling(patch: Partial<BillingState>): BillingState {
  const next = { ...loadBilling(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function entitlements(plan: PlanId) {
  if (plan === "scale") return { label: "Scale", aiBudget: 80, webhooks: true, maxProjects: 20 };
  if (plan === "team") return { label: "Team", aiBudget: 20, webhooks: true, maxProjects: 5 };
  return { label: "Free", aiBudget: 2, webhooks: false, maxProjects: 1 };
}

export function planAllows(feature: "webhooks") {
  return entitlements(loadBilling().plan)[feature];
}
