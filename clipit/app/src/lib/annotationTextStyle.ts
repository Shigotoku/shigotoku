import type { AnnotationFontFamily, StepAnnotation } from '../types';

export const FONT_FAMILIES: { id: AnnotationFontFamily; label: string; css: string }[] = [
  { id: 'noto', label: 'ゴシック', css: '"Noto Sans JP", sans-serif' },
  { id: 'mincho', label: '明朝', css: '"Noto Serif JP", serif' },
  { id: 'inter', label: 'Inter', css: 'Inter, sans-serif' },
  { id: 'mono', label: '等幅', css: 'ui-monospace, SFMono-Regular, monospace' },
];

export type TextStylePreset = {
  fontSize: number;
  fontFamily: AnnotationFontFamily;
  fontWeight: 'normal' | 'bold';
  textColor: string;
  bgColor: string;
  borderColor: string;
  borderWidth: number;
};

export const DEFAULT_TEXT_STYLE: TextStylePreset = {
  fontSize: 22,
  fontFamily: 'noto',
  fontWeight: 'bold',
  textColor: '#78350f',
  bgColor: 'rgba(251,191,36,0.95)',
  borderColor: '#f59e0b',
  borderWidth: 2,
};

/** ワンクリックで適用できる吹き出しプリセット */
export const TEXT_CALLOUT_PRESETS: Array<{ id: string; label: string } & TextStylePreset> = [
  {
    id: 'warning',
    label: '注意',
    fontSize: 22,
    fontFamily: 'noto',
    fontWeight: 'bold',
    textColor: '#78350f',
    bgColor: 'rgba(251,191,36,0.95)',
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  {
    id: 'info',
    label: '補足',
    fontSize: 20,
    fontFamily: 'noto',
    fontWeight: 'normal',
    textColor: '#1e3a5f',
    bgColor: 'rgba(191,219,254,0.95)',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  {
    id: 'danger',
    label: 'NG',
    fontSize: 22,
    fontFamily: 'noto',
    fontWeight: 'bold',
    textColor: '#ffffff',
    bgColor: 'rgba(220,38,38,0.92)',
    borderColor: '#b91c1c',
    borderWidth: 2,
  },
  {
    id: 'neutral',
    label: '通常',
    fontSize: 20,
    fontFamily: 'noto',
    fontWeight: 'normal',
    textColor: '#1e293b',
    bgColor: 'rgba(255,255,255,0.96)',
    borderColor: '#64748b',
    borderWidth: 2,
  },
  {
    id: 'highlight',
    label: '強調',
    fontSize: 24,
    fontFamily: 'noto',
    fontWeight: 'bold',
    textColor: '#ffffff',
    bgColor: 'rgba(234,88,12,0.92)',
    borderColor: '#c2410c',
    borderWidth: 2,
  },
];

export function fontFamilyCss(id?: AnnotationFontFamily): string {
  return FONT_FAMILIES.find((f) => f.id === id)?.css ?? FONT_FAMILIES[0]!.css;
}

export function textDisplayPx(fontSize: number | undefined, overlayWidth: number): number {
  return Math.max(10, Math.round((fontSize ?? DEFAULT_TEXT_STYLE.fontSize) * (overlayWidth / 800)));
}

export function textCompositePx(fontSize: number | undefined, imageWidth: number): number {
  return Math.max(12, Math.round((fontSize ?? DEFAULT_TEXT_STYLE.fontSize) * (imageWidth / 800)));
}

export function borderDisplayPx(borderWidth: number | undefined, overlayWidth: number): number {
  return Math.max(1, Math.round((borderWidth ?? DEFAULT_TEXT_STYLE.borderWidth) * (overlayWidth / 800)));
}

export function textStyleOf(a: StepAnnotation) {
  return {
    fontSize: a.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
    fontFamily: a.fontFamily ?? DEFAULT_TEXT_STYLE.fontFamily,
    fontWeight: a.fontWeight ?? DEFAULT_TEXT_STYLE.fontWeight,
    textColor: a.textColor ?? DEFAULT_TEXT_STYLE.textColor,
    bgColor: a.bgColor ?? DEFAULT_TEXT_STYLE.bgColor,
    borderColor: a.borderColor ?? DEFAULT_TEXT_STYLE.borderColor,
    borderWidth: a.borderWidth ?? DEFAULT_TEXT_STYLE.borderWidth,
  };
}

function pctToPx(pct: number, dim: number): number {
  return (pct / 100) * dim;
}

function autoTextWidth(text: string, px: number, boxW: number): number {
  const lines = text.split('\n');
  const maxLen = Math.max(...lines.map((l) => l.length), 1);
  return Math.min(boxW * 0.65, Math.max(80, maxLen * px * 0.62 + 20));
}

function autoTextHeight(text: string, px: number): number {
  const lines = Math.max(1, text.split('\n').length);
  return Math.max(px + 16, lines * px * 1.35 + 12);
}

export function estimateTextBox(
  a: StepAnnotation,
  boxW: number,
  boxH: number,
): { left: number; top: number; width: number; height: number } {
  const px = textDisplayPx(a.fontSize, boxW);
  const text = a.text ?? '';
  const width = a.boxWidthPct != null ? pctToPx(a.boxWidthPct, boxW) : autoTextWidth(text, px, boxW);
  const height = a.boxHeightPct != null ? pctToPx(a.boxHeightPct, boxH) : autoTextHeight(text, px);
  const left = pctToPx(a.x, boxW) - 4;
  const top = pctToPx(a.y, boxH) - 4;
  return { left, top, width, height };
}

export function defaultBoxSizePct(a: StepAnnotation, boxW: number, boxH: number): { w: number; h: number } {
  const est = estimateTextBox({ ...a, boxWidthPct: undefined, boxHeightPct: undefined }, boxW, boxH);
  return {
    w: Math.round((est.width / boxW) * 1000) / 10,
    h: Math.round((est.height / boxH) * 1000) / 10,
  };
}

export function stylePresetToAnnotationPatch(preset: TextStylePreset): Partial<StepAnnotation> {
  return {
    fontSize: preset.fontSize,
    fontFamily: preset.fontFamily,
    fontWeight: preset.fontWeight,
    textColor: preset.textColor,
    bgColor: preset.bgColor,
    borderColor: preset.borderColor,
    borderWidth: preset.borderWidth,
  };
}
