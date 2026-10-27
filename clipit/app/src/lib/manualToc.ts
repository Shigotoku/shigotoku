import type { ManualStep } from '../types';

const TOC_STORAGE_KEY = 'clipit-toc-enabled';

export function stepAnchorId(order: number): string {
  return `step-${order}`;
}

export function persistTocEnabled(enabled: boolean): void {
  try {
    sessionStorage.setItem(TOC_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function readPersistedTocEnabled(): boolean {
  try {
    return sessionStorage.getItem(TOC_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function resolveTocEnabled(params: URLSearchParams): boolean {
  const v = params.get('toc');
  if (v === '1') return true;
  if (v === '0') return false;
  return readPersistedTocEnabled();
}

export function buildTocItems(steps: ManualStep[]): Array<{ order: number; title: string; anchor: string }> {
  return [...steps]
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({
      order: i + 1,
      title: s.title?.trim() || `手順 ${i + 1}`,
      anchor: stepAnchorId(s.order),
    }));
}
