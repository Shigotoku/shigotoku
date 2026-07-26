import type { IndustryId } from './industryTemplates';
import { getIndustryTemplate } from './industryTemplates';

export type CalendarPostSlot = {
  day: number;
  title: string;
  platform: string;
  pillar: string;
  hook: string;
  cta: string;
};

/** 業種別「最初の30本」— 貼るだけで4週間回るカレンダー */
export function buildFirst30Calendar(industry: IndustryId = 'general'): CalendarPostSlot[] {
  const t = getIndustryTemplate(industry);
  const platforms = t.primaryPlatforms;
  const slots: CalendarPostSlot[] = [];

  for (let day = 1; day <= 30; day++) {
    const idea = t.weekIdeas[(day - 1) % t.weekIdeas.length];
    const hook = t.hooks[(day - 1) % t.hooks.length];
    const pillar = t.pillars[(day - 1) % t.pillars.length];
    const platform = platforms[(day - 1) % platforms.length] ?? 'Instagram';
    const isOffer = day % 5 === 0;
    slots.push({
      day,
      title: isOffer ? `空き枠・特典案内（Day ${day}）` : idea,
      platform,
      pillar: isOffer ? '予約・特典' : pillar.name,
      hook: hook.example,
      cta: isOffer
        ? 'プロフィールのLINE / 予約リンクへ'
        : day % 3 === 0
          ? '保存してあとで見返してね'
          : '詳しくはプロフィールから',
    });
  }
  return slots;
}
