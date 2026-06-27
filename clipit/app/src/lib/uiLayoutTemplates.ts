import type { ManualStep, StepImageAlign, StepType } from '../types';

export type UiLayoutId =
  | 'standard-vertical'
  | 'image-left'
  | 'image-right'
  | 'compact'
  | 'notes-focus'
  | 'summary-top';

export interface UiLayoutStepDefaults {
  imageWidthPct: number;
  imageAlign: StepImageAlign;
  textBeforeImage?: string;
  instruction?: string;
  note?: string;
  type?: StepType;
}

export interface UiLayoutTemplate {
  id: UiLayoutId;
  name: string;
  description: string;
  /** マニュアル先頭のまとめ文（summary-top など） */
  manualDescription?: string;
  stepDefaults: UiLayoutStepDefaults;
}

export const UI_LAYOUT_TEMPLATES: UiLayoutTemplate[] = [
  {
    id: 'standard-vertical',
    name: '標準・縦並び',
    description: '画像を大きく中央に、説明文を下に配置。はじめてのマニュアル向け。',
    stepDefaults: { imageWidthPct: 100, imageAlign: 'center' },
  },
  {
    id: 'image-left',
    name: '画像左・説明右',
    description: '画像を左に、操作説明を右に並べる。手順が多い業務向け。',
    stepDefaults: {
      imageWidthPct: 45,
      imageAlign: 'left',
      textBeforeImage: 'この画面で行う操作の概要です。',
    },
  },
  {
    id: 'image-right',
    name: '画像右・説明左',
    description: '説明を先に読んでから画像を確認するレイアウト。',
    stepDefaults: {
      imageWidthPct: 45,
      imageAlign: 'right',
      textBeforeImage: '次の画面操作を行います。',
    },
  },
  {
    id: 'compact',
    name: 'コンパクト',
    description: '画像をやや小さく、1ページに多くの手順を載せたいとき。',
    stepDefaults: { imageWidthPct: 65, imageAlign: 'center' },
  },
  {
    id: 'notes-focus',
    name: '注意点重視',
    description: '注意・NG例を目立たせる。医療・会計などミス防止が重要な業務向け。',
    stepDefaults: {
      imageWidthPct: 80,
      imageAlign: 'center',
      note: '※ ここでよくある間違い・注意点を記載してください',
      type: 'warning',
    },
  },
  {
    id: 'summary-top',
    name: 'まとめ付き',
    description: 'マニュアル冒頭に目的・対象者のまとめ、各手順に要点を配置。',
    manualDescription: '【目的】\nこのマニュアルの目的と対象者をここに記載します。\n\n【全体の流れ】\n手順1から順に進めてください。',
    stepDefaults: {
      imageWidthPct: 90,
      imageAlign: 'center',
      textBeforeImage: 'この手順のポイント',
    },
  },
];

export const DEFAULT_UI_LAYOUT_ID: UiLayoutId = 'standard-vertical';

const STORAGE_KEY = 'clipit-ui-layout-id';

export function persistUiLayoutId(id: UiLayoutId): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readPersistedUiLayoutId(): UiLayoutId | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw && UI_LAYOUT_TEMPLATES.some((t) => t.id === raw)) return raw as UiLayoutId;
  } catch {
    /* ignore */
  }
  return null;
}

/** URL → sessionStorage → 既定値 の順で UI レイアウトを解決 */
export function resolveUiLayoutId(params: URLSearchParams): UiLayoutId {
  const fromUrl = params.get('layout');
  if (fromUrl && UI_LAYOUT_TEMPLATES.some((t) => t.id === fromUrl)) {
    return fromUrl as UiLayoutId;
  }
  return readPersistedUiLayoutId() ?? DEFAULT_UI_LAYOUT_ID;
}

export function getUiLayoutTemplate(id: UiLayoutId | string | undefined): UiLayoutTemplate {
  return UI_LAYOUT_TEMPLATES.find((t) => t.id === id) ?? UI_LAYOUT_TEMPLATES[0]!;
}

/** @deprecated resolveUiLayoutId を使用 */
export function layoutIdFromSearch(params: URLSearchParams): UiLayoutId {
  const id = resolveUiLayoutId(params);
  persistUiLayoutId(id);
  return id;
}

export function appendLayoutQuery(path: string, layoutId: UiLayoutId): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}layout=${encodeURIComponent(layoutId)}`;
}

/** 新規手順・既存手順へ UI ひな型の配置を適用（内容テンプレートの文言は維持） */
export function stepFieldsFromLayout(
  layoutId: UiLayoutId | string | undefined,
  existing?: Partial<ManualStep>,
  options?: { forceLayout?: boolean },
): Pick<ManualStep, 'imageWidthPct' | 'imageAlign' | 'textBeforeImage' | 'note' | 'type'> {
  const layout = getUiLayoutTemplate(layoutId);
  const d = layout.stepDefaults;
  const force = options?.forceLayout ?? false;

  if (force) {
    return {
      imageWidthPct: d.imageWidthPct,
      imageAlign: d.imageAlign,
      textBeforeImage: d.textBeforeImage ?? '',
      note: d.note ?? existing?.note ?? '',
      type: d.type ?? existing?.type ?? 'normal',
    };
  }

  return {
    imageWidthPct: d.imageWidthPct,
    imageAlign: d.imageAlign,
    textBeforeImage: existing?.textBeforeImage?.trim() ? existing.textBeforeImage : (d.textBeforeImage ?? ''),
    note: existing?.note?.trim() ? existing.note : (d.note ?? ''),
    type: existing?.type ?? d.type ?? 'normal',
  };
}
