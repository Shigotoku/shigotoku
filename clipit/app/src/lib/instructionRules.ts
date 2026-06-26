import type { ManualStep, TargetAudience } from '../types';

export type InstructionTone = 'simple' | 'formal' | 'manual' | 'short' | 'detailed';

function verbForRole(role?: string): string {
  const r = (role || '').toLowerCase();
  if (r.includes('button') || r.includes('link')) return 'クリックします';
  if (r.includes('textbox') || r.includes('searchbox') || r.includes('input')) return '入力します';
  if (r.includes('combobox') || r.includes('listbox') || r.includes('select')) return '選択します';
  if (r.includes('checkbox')) return 'チェックを入れます';
  if (r.includes('radio')) return '選択します';
  if (r.includes('tab')) return 'タブを開きます';
  if (r.includes('menu') || r.includes('menuitem')) return 'メニューから選びます';
  if (r.includes('switch')) return '切り替えます';
  return '操作します';
}

function audienceHint(audience: TargetAudience): string {
  if (audience === 'patient') return '分かりやすい言葉で';
  if (audience === 'developer') return '画面名を明示して';
  return '';
}

export type StepInstructionInput = {
  title?: string;
  elementText?: string;
  elementRole?: string;
  pageTitle?: string;
  pageUrl?: string;
  note?: string;
  instruction?: string;
};

export function buildInstructionFromStep(
  step: StepInstructionInput,
  tone: InstructionTone = 'simple',
  audience: TargetAudience = 'new_staff',
): string {
  const existing = step.instruction?.trim();
  if (existing && tone === 'simple') return existing;

  const raw = (step.elementText || step.title || '画面の要素').trim();
  const el = raw.slice(0, 120);
  const page = step.pageTitle?.trim();
  const note = step.note?.trim();
  const verb = verbForRole(step.elementRole);
  const hint = audienceHint(audience);

  if (tone === 'short') return `${el}を操作。`;

  if (tone === 'formal' || tone === 'manual') {
    let s = `【手順】「${el}」を${verb}`;
    if (page) s += `（画面：${page}）`;
    if (note) s += ` ※${note}`;
    if (hint && tone === 'manual') s = `${hint}、${s}`;
    return s;
  }

  if (tone === 'detailed') {
    let s = page ? `「${page}」画面で、「${el}」を${verb}` : `「${el}」を${verb}`;
    if (note) s += `。${note}`;
    return s.endsWith('。') ? s : `${s}。`;
  }

  let s = `「${el}」を${verb}`;
  if (page) s += `（${page}）`;
  if (note) s += `。${note}`;
  return s.endsWith('。') ? s : `${s}。`;
}
