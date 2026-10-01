export interface FeatureFlags {
  ideas: boolean;
  roadmap: boolean;
  digest: boolean;
  insights: boolean;
  ranking: boolean;
  customerPortal: boolean;
  webhooks: boolean;
  autoMergeAssist: boolean;
}

const KEY = "shapeit:flags:v1";

const DEFAULTS: FeatureFlags = {
  ideas: true,
  roadmap: true,
  digest: true,
  insights: true,
  ranking: true,
  customerPortal: true,
  webhooks: true,
  autoMergeAssist: true,
};

export function loadFlags(): FeatureFlags {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<FeatureFlags>) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

export function saveFlags(patch: Partial<FeatureFlags>): FeatureFlags {
  const next = { ...loadFlags(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("shapeit-flags"));
  return next;
}
