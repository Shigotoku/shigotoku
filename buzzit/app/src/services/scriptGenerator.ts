import type { GeneratedScript } from '../types';
import { checkBrandSafety, sanitizeForSalon } from './brandSafety';

function extractTopic(idea: string): string {
  const trimmed = idea.trim();
  if (!trimmed) return '新作メニュー';
  const match = trimmed.match(/[「『](.+?)[」』]/);
  return match?.[1] ?? trimmed.slice(0, 24);
}

export function generateScript(idea: string): GeneratedScript {
  const topic = extractTopic(idea);
  const raw = {
    title: `【悲報】${topic}、知らないと損します`,
    hook: `「${topic}に興味あるけど、失敗したくない…」そんなお悩み、ありませんか？`,
    body: `実は${topic}は、選び方ひとつで仕上がりが全然変わります。\n\n当店では現場の声をもとに、再現性の高い施術フローを整えています。`,
    cta: `詳細はプロフィールのLINEから。限定クーポン配布中✨`,
  };

  const safety = checkBrandSafety(`${raw.title}${raw.hook}${raw.body}`);
  if (!safety.safe) {
    return {
      title: sanitizeForSalon(raw.title),
      hook: sanitizeForSalon(raw.hook),
      body: sanitizeForSalon(raw.body),
      cta: raw.cta,
    };
  }

  return raw;
}

export function formatScriptForVideo(script: GeneratedScript): string {
  return `【タイトル】${script.title}\n\n【フック】${script.hook}\n\n【本編】\n${script.body}\n\n【CTA】${script.cta}`;
}
