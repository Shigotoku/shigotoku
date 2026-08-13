export interface AiBudget {
  monthlyLimitUsd: number;
  usedUsd: number;
}

const KEY = "shapeit:ai-budget:v1";

export function loadAiBudget(): AiBudget {
  try {
    return { monthlyLimitUsd: 20, usedUsd: 0, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { monthlyLimitUsd: 20, usedUsd: 0 };
  }
}

export function saveAiBudget(patch: Partial<AiBudget>): AiBudget {
  const next = { ...loadAiBudget(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
