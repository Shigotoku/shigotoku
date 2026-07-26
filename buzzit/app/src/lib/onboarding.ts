import { INDUSTRY_STORAGE_KEY, type IndustryId } from '../data/industryTemplates';

export const ONBOARDING_STORAGE_KEY = 'buzzit.onboarding.v1';

export type OnboardingGoal = 'new' | 'repeat' | 'hire' | 'aware';

export type OnboardingState = {
  completed: boolean;
  skipped?: boolean;
  industryId?: IndustryId;
  goal?: OnboardingGoal;
  primaryPlatform?: string;
  completedAt?: string;
};

export const ONBOARDING_GOALS: Array<{ id: OnboardingGoal; label: string; hint: string }> = [
  { id: 'new', label: '新規の予約・来店を増やしたい', hint: 'Instagram + LINE が王道' },
  { id: 'repeat', label: 'リピーターを増やしたい', hint: 'LINE ステップ配信を優先' },
  { id: 'hire', label: '採用・スタッフ集め', hint: 'X + Instagram で雰囲気発信' },
  { id: 'aware', label: 'まず認知を広げたい', hint: 'TikTok / リールで拡散' },
];

export function loadOnboarding(): OnboardingState {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return { completed: false };
    const parsed = JSON.parse(raw) as OnboardingState;
    return { completed: false, ...parsed };
  } catch {
    return { completed: false };
  }
}

export function saveOnboarding(patch: Partial<OnboardingState>): OnboardingState {
  const next = { ...loadOnboarding(), ...patch };
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
  if (next.industryId) {
    localStorage.setItem(INDUSTRY_STORAGE_KEY, next.industryId);
  }
  return next;
}

export function isOnboardingDone(): boolean {
  return !!loadOnboarding().completed;
}

export function completeOnboarding(input: {
  industryId: IndustryId;
  goal: OnboardingGoal;
  primaryPlatform: string;
  skipped?: boolean;
}): OnboardingState {
  return saveOnboarding({
    completed: true,
    skipped: !!input.skipped,
    industryId: input.industryId,
    goal: input.goal,
    primaryPlatform: input.primaryPlatform,
    completedAt: new Date().toISOString(),
  });
}
