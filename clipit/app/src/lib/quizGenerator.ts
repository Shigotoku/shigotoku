import type { ManualStep } from '../types';

export interface QuizQuestion {
  id: string;
  type: 'choice' | 'check';
  question: string;
  choices?: string[];
  answer: string;
  stepOrder: number;
}

/** 手順から確認テストをルールベース生成（教育モード用） */
export function generateQuizFromSteps(steps: ManualStep[], count = 5): QuizQuestion[] {
  const pool = steps.filter((s) => s.instruction.trim().length > 8);
  const picked = pool.slice(0, Math.min(count, pool.length));
  return picked.map((s, i) => {
    const action = s.instruction.split(/。/)[0]?.trim() ?? s.instruction;
    const wrong = steps
      .filter((x) => x.id !== s.id)
      .map((x) => x.title)
      .filter(Boolean)
      .slice(0, 3);
    const choices = [s.title || `手順${s.order}`, ...wrong].slice(0, 4);
    while (choices.length < 2) choices.push('（該当なし）');
    return {
      id: `q-${s.order}-${i}`,
      type: 'choice' as const,
      question: `手順${s.order}で行うこととして正しいのはどれですか？`,
      choices: shuffle(choices),
      answer: s.title || `手順${s.order}`,
      stepOrder: s.order,
    };
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
