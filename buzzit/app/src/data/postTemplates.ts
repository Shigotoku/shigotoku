import { industryTemplates, type IndustryId } from './industryTemplates';
import { loadOnboarding } from '../lib/onboarding';

export type PostTemplate = {
  id: string;
  title: string;
  idea: string;
  pillar?: string;
};

/** 業種別の投稿ネタテンプレ（Inbox / クリエイター用） */
export function getPostTemplates(industryId?: IndustryId): PostTemplate[] {
  const onboarding = loadOnboarding();
  const id = industryId ?? onboarding.industryId ?? 'general';
  const industry = industryTemplates.find((t) => t.id === id) ?? industryTemplates.find((t) => t.id === 'general')!;

  const fromWeek = industry.weekIdeas.map((idea, i) => ({
    id: `${industry.id}-week-${i}`,
    title: idea.length > 22 ? `${idea.slice(0, 22)}…` : idea,
    idea,
    pillar: '週間ネタ',
  }));

  const fromHooks = industry.hooks.slice(0, 4).map((h) => ({
    id: `${industry.id}-hook-${h.id}`,
    title: h.name,
    idea: `${h.example}\n\n（${industry.label}向け）`,
    pillar: 'フック',
  }));

  const fromPillars = industry.pillars.flatMap((p) =>
    p.examples.slice(0, 2).map((ex, i) => ({
      id: `${industry.id}-pillar-${p.id}-${i}`,
      title: `${p.name}: ${ex}`,
      idea: `${ex}\n\nトーン: ${industry.blurb}`,
      pillar: p.name,
    })),
  );

  return [...fromWeek.slice(0, 5), ...fromHooks, ...fromPillars].slice(0, 12);
}
