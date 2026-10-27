import type { MaskRect, StepAnnotation } from '../types';

const PREFIX = 'clipit:overlay-template:';
const CLIPBOARD_KEY = `${PREFIX}clipboard`;
const AUTO_APPLY_PREFIX = `${PREFIX}auto-apply:`;
const CARRY_PREF_PREFIX = `${PREFIX}carry-pref:`;

export interface ScreenEditorOverlayTemplate {
  version: 1;
  masks: Omit<MaskRect, 'id'>[];
  annotations: Omit<StepAnnotation, 'id'>[];
  defaultStrokeColor?: string;
  defaultStrokeWidth?: number;
  sourceStepOrder?: number;
  savedAt: number;
}

function manualLatestKey(manualId: string): string {
  return `${PREFIX}${manualId}:latest`;
}

function stepKey(manualId: string, stepId: string): string {
  return `${PREFIX}${manualId}:step:${stepId}`;
}

function readTemplate(key: string): ScreenEditorOverlayTemplate | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScreenEditorOverlayTemplate;
    if (parsed?.version !== 1 || !Array.isArray(parsed.masks) || !Array.isArray(parsed.annotations)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeTemplate(key: string, template: ScreenEditorOverlayTemplate): void {
  try {
    localStorage.setItem(key, JSON.stringify(template));
  } catch {
    /* quota exceeded etc. */
  }
}

export function buildOverlayTemplate(
  masks: MaskRect[],
  annotations: StepAnnotation[],
  meta?: {
    defaultStrokeColor?: string;
    defaultStrokeWidth?: number;
    sourceStepOrder?: number;
  },
): ScreenEditorOverlayTemplate {
  return {
    version: 1,
    masks: masks.map(({ id: _id, ...rest }) => rest),
    annotations: annotations.map(({ id: _id, ...rest }) => rest),
    defaultStrokeColor: meta?.defaultStrokeColor,
    defaultStrokeWidth: meta?.defaultStrokeWidth,
    sourceStepOrder: meta?.sourceStepOrder,
    savedAt: Date.now(),
  };
}

export function applyOverlayTemplate(
  template: ScreenEditorOverlayTemplate,
  options?: { stepOrder?: number; clearText?: boolean },
): { masks: MaskRect[]; annotations: StepAnnotation[] } {
  const masks: MaskRect[] = template.masks.map((m) => ({
    ...m,
    id: crypto.randomUUID(),
  }));
  const annotations: StepAnnotation[] = template.annotations.map((a) => {
    const ann = { ...a, id: crypto.randomUUID() } as StepAnnotation;
    if (ann.kind === 'badge' && options?.stepOrder != null && options.stepOrder > 0) {
      ann.text = String(options.stepOrder);
    }
    if (ann.kind === 'text' && options?.clearText) {
      ann.text = '';
    }
    return ann;
  });
  return { masks, annotations };
}

export function saveManualOverlayTemplate(manualId: string, template: ScreenEditorOverlayTemplate): void {
  writeTemplate(manualLatestKey(manualId), template);
}

export function saveStepOverlayTemplate(
  manualId: string,
  stepId: string,
  template: ScreenEditorOverlayTemplate,
): void {
  writeTemplate(stepKey(manualId, stepId), template);
}

export function loadManualOverlayTemplate(manualId: string): ScreenEditorOverlayTemplate | null {
  return readTemplate(manualLatestKey(manualId));
}

export function loadStepOverlayTemplate(manualId: string, stepId: string): ScreenEditorOverlayTemplate | null {
  return readTemplate(stepKey(manualId, stepId));
}

export function saveOverlayClipboard(template: ScreenEditorOverlayTemplate): void {
  writeTemplate(CLIPBOARD_KEY, template);
}

export function loadOverlayClipboard(): ScreenEditorOverlayTemplate | null {
  return readTemplate(CLIPBOARD_KEY);
}

export function setAutoApplyLayout(manualId: string, enabled: boolean): void {
  try {
    if (enabled) sessionStorage.setItem(`${AUTO_APPLY_PREFIX}${manualId}`, '1');
    else sessionStorage.removeItem(`${AUTO_APPLY_PREFIX}${manualId}`);
  } catch {
    /* ignore */
  }
}

export function consumeAutoApplyLayout(manualId: string): boolean {
  try {
    const key = `${AUTO_APPLY_PREFIX}${manualId}`;
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function loadCarryOverPreference(manualId: string): boolean {
  try {
    const v = localStorage.getItem(`${CARRY_PREF_PREFIX}${manualId}`);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function saveCarryOverPreference(manualId: string, enabled: boolean): void {
  try {
    localStorage.setItem(`${CARRY_PREF_PREFIX}${manualId}`, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function templateSummary(template: ScreenEditorOverlayTemplate): string {
  const texts = template.annotations.filter((a) => a.kind === 'text').length;
  const shapes = template.annotations.filter((a) => a.kind !== 'text').length;
  const maskCount = template.masks.length;
  const parts: string[] = [];
  if (maskCount) parts.push(`マスク${maskCount}`);
  if (shapes) parts.push(`図形${shapes}`);
  if (texts) parts.push(`テキスト${texts}`);
  return parts.join(' · ') || '空';
}

export function templateIsEmpty(template: ScreenEditorOverlayTemplate): boolean {
  return template.masks.length === 0 && template.annotations.length === 0;
}
