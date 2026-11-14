import { STORAGE_KEY, type ConnectionSnapshot } from '../../data/growthRoadmap';
import { INDUSTRY_STORAGE_KEY, industryTemplates, type IndustryId } from '../../data/industryTemplates';
import { COMPANION_STORAGE_KEY } from '../../data/platformCompanions';

export type MainTab = 'journey' | 'industry' | 'platforms' | 'playbook' | 'rhythm';

export const mainTabs: Array<{ key: MainTab; label: string }> = [
  { key: 'journey', label: '30日ジャーニー' },
  { key: 'industry', label: '業種別テンプレ' },
  { key: 'platforms', label: 'SNS伴走ガイド' },
  { key: 'playbook', label: 'ばずらせ方' },
  { key: 'rhythm', label: '週間リズム・FAQ' },
];

export function loadCompanionDone(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(COMPANION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function loadDone(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function loadIndustry(): IndustryId | null {
  try {
    const raw = localStorage.getItem(INDUSTRY_STORAGE_KEY);
    if (!raw) return null;
    if (industryTemplates.some((t) => t.id === raw)) return raw as IndustryId;
    return null;
  } catch {
    return null;
  }
}

export function emptySnapshot(): ConnectionSnapshot {
  return {
    metaConnected: false,
    lineConnected: false,
    slackConnected: false,
    publishModeReady: false,
    hasTeam: false,
    hasLineStep: false,
    hasDestinationUrl: false,
  };
}
