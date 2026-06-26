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
};

export const DEFAULT_TEXT_STYLE: TextStylePreset = {
  fontSize: 22,
  fontFamily: 'noto',
  fontWeight: 'bold',
  textColor: '#78350f',
  bgColor: 'rgba(251,191,36,0.95)',
};

export function fontFamilyCss(id?: AnnotationFontFamily): string {
  return FONT_FAMILIES.find((f) => f.id === id)?.css ?? FONT_FAMILIES[0]!.css;
}

/** エディタ上の表示 px（画像オーバーレイ幅に合わせてスケール） */
export function textDisplayPx(fontSize: number | undefined, overlayWidth: number): number {
  return Math.max(10, Math.round((fontSize ?? DEFAULT_TEXT_STYLE.fontSize) * (overlayWidth / 800)));
}

/** 画像焼き込み時の px */
export function textCompositePx(fontSize: number | undefined, imageWidth: number): number {
  return Math.max(12, Math.round((fontSize ?? DEFAULT_TEXT_STYLE.fontSize) * (imageWidth / 800)));
}

export function textStyleOf(a: StepAnnotation) {
  return {
    fontSize: a.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
    fontFamily: a.fontFamily ?? DEFAULT_TEXT_STYLE.fontFamily,
    fontWeight: a.fontWeight ?? DEFAULT_TEXT_STYLE.fontWeight,
    textColor: a.textColor ?? DEFAULT_TEXT_STYLE.textColor,
    bgColor: a.bgColor ?? DEFAULT_TEXT_STYLE.bgColor,
  };
}

export function estimateTextBox(
  a: StepAnnotation,
  boxW: number,
  boxH: number,
): { left: number; top: number; width: number; height: number } {
  const px = textDisplayPx(a.fontSize, boxW);
  const text = a.text ?? '';
  const width = Math.min(boxW * 0.55, Math.max(48, text.length * px * 0.62 + 16));
  const height = px + 12;
  const left = pctToPx(a.x, boxW) - 4;
  const top = pctToPx(a.y, boxH) - 4;
  return { left, top, width, height };
}

function pctToPx(pct: number, dim: number): number {
  return (pct / 100) * dim;
}
