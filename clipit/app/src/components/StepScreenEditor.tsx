import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Maximize2,
  Circle,
  Type,
  Square,
  ArrowRight,
  Loader2,
  MousePointer2,
  Undo2,
  Redo2,
  Bold,
  Highlighter,
  Hash,
  Copy,
  ClipboardPaste,
  Layers,
  ChevronRight,
  Crop,
} from 'lucide-react';
import { compositeScreenshot } from '../lib/compositeScreenshot';
import {
  DEFAULT_TEXT_STYLE,
  FONT_FAMILIES,
  TEXT_CALLOUT_PRESETS,
  borderDisplayPx,
  defaultBoxSizePct,
  estimateTextBox,
  fontFamilyCss,
  stylePresetToAnnotationPatch,
  textDisplayPx,
  textStyleOf,
  type TextStylePreset,
} from '../lib/annotationTextStyle';
import { uploadStepScreenshot } from '../lib/uploadStepScreenshot';
import {
  applyOverlayTemplate,
  buildOverlayTemplate,
  consumeAutoApplyLayout,
  loadCarryOverPreference,
  loadManualOverlayTemplate,
  loadOverlayClipboard,
  loadStepOverlayTemplate,
  saveCarryOverPreference,
  saveManualOverlayTemplate,
  saveOverlayClipboard,
  saveStepOverlayTemplate,
  setAutoApplyLayout,
  templateIsEmpty,
  templateSummary,
  type ScreenEditorOverlayTemplate,
} from '../lib/screenEditorTemplate';
import type { AnnotationFontFamily, ImageCropRect, MaskRect, MaskStyle, StepAnnotation } from '../types';

type Tool =
  | 'select'
  | 'mask-black'
  | 'mask-mosaic'
  | 'mask-blur'
  | 'mask-highlight'
  | 'circle'
  | 'arrow'
  | 'badge'
  | 'text'
  | 'crop';

const DEFAULT_STROKE_COLOR = '#ef4444';
const DEFAULT_STROKE_WIDTH = 3;
const DEFAULT_BADGE_FILL = '#ea580c';

type HistoryState = { items: EditorSnapshot[]; index: number };

export type ScreenEditorSaveResult = {
  masks: MaskRect[];
  annotations: StepAnnotation[];
  screenshotUrl: string;
  imageBorderColor?: string;
  imageBorderWidth?: number;
};

interface Props {
  screenshotUrl: string;
  manualId: string;
  stepId: string;
  /** 手順番号（番号バッジの初期値） */
  stepOrder?: number;
  /** 1つ前の手順 ID（レイアウト引き継ぎ用） */
  previousStepId?: string | null;
  /** 次の手順 ID（保存して続行用） */
  nextStepId?: string | null;
  masks: MaskRect[];
  annotations: StepAnnotation[];
  imageBorderColor?: string;
  imageBorderWidth?: number;
  onSave: (result: ScreenEditorSaveResult) => void;
  /** 保存後に次の手順の編集を開く */
  onSaveAndNext?: (result: ScreenEditorSaveResult) => void | Promise<void>;
  onClose: () => void;
}

type Selection =
  | { kind: 'mask'; id: string }
  | { kind: 'annotation'; id: string }
  | null;

type EditorSnapshot = { masks: MaskRect[]; annotations: StepAnnotation[] };

type DragMode =
  | 'create-mask'
  | 'create-crop'
  | 'create-circle'
  | 'create-arrow'
  | 'move-mask'
  | 'move-annotation'
  | 'move-crop'
  | 'resize-mask'
  | 'resize-circle'
  | 'resize-arrow-start'
  | 'resize-arrow-end'
  | 'resize-text-box'
  | 'resize-crop-n'
  | 'resize-crop-s'
  | 'resize-crop-e'
  | 'resize-crop-w'
  | 'resize-crop-ne'
  | 'resize-crop-nw'
  | 'resize-crop-se'
  | 'resize-crop-sw';

interface OverlayPoint {
  x: number;
  y: number;
  boxW: number;
  boxH: number;
  pctX: number;
  pctY: number;
}

interface DragSession {
  mode: DragMode;
  pointerId: number;
  startPctX: number;
  startPctY: number;
  startX: number;
  startY: number;
  snapshot: EditorSnapshot;
  selection: Selection | null;
  maskType?: MaskStyle;
  startBoxWPct?: number;
  startBoxHPct?: number;
  startCropRect?: ImageCropRect;
}

function isPercentMask(m: MaskRect): boolean {
  return m.x <= 100 && m.y <= 100 && m.width <= 100 && m.height <= 100;
}

function pxToPercent(x: number, y: number, w: number, h: number, boxW: number, boxH: number) {
  return {
    x: Math.round((x / boxW) * 1000) / 10,
    y: Math.round((y / boxH) * 1000) / 10,
    width: Math.round((w / boxW) * 1000) / 10,
    height: Math.round((h / boxH) * 1000) / 10,
  };
}

function pctToPx(pct: number, dim: number): number {
  return (pct / 100) * dim;
}

function maskStyleClass(type: MaskStyle): string {
  if (type === 'pixelate') {
    return 'bg-[length:10px_10px] bg-[image:repeating-conic-gradient(#6b7280_0%_25%,#9ca3af_0%_50%)] opacity-95';
  }
  if (type === 'blur') {
    return 'bg-slate-400/60 backdrop-blur-md';
  }
  if (type === 'highlight') {
    return 'border-2 border-yellow-500/80 bg-yellow-400/45';
  }
  return 'bg-black/90';
}

function strokeColorOf(a: StepAnnotation): string {
  return a.strokeColor ?? DEFAULT_STROKE_COLOR;
}

function strokeDisplayPx(a: StepAnnotation, boxW: number): number {
  const base = a.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  return Math.max(2, base * (boxW / 800));
}

function nextBadgeLabel(annotations: StepAnnotation[], stepOrder?: number): string {
  if (stepOrder != null && stepOrder > 0) return String(stepOrder);
  const nums = annotations
    .filter((a) => a.kind === 'badge')
    .map((a) => parseInt(a.text ?? '', 10))
    .filter((n) => !Number.isNaN(n));
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}

function cloneSnapshot(masks: MaskRect[], annotations: StepAnnotation[]): EditorSnapshot {
  return {
    masks: masks.map((m) => ({ ...m })),
    annotations: annotations.map((a) => ({ ...a })),
  };
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

const MIN_CROP_PCT = 5;

function clampCropRect(r: ImageCropRect): ImageCropRect {
  const width = Math.max(MIN_CROP_PCT, Math.min(100, r.width));
  const height = Math.max(MIN_CROP_PCT, Math.min(100, r.height));
  return {
    x: Math.max(0, Math.min(100 - width, r.x)),
    y: Math.max(0, Math.min(100 - height, r.y)),
    width,
    height,
  };
}

function cropInsetClipPath(r: ImageCropRect): string {
  const top = r.y;
  const right = 100 - r.x - r.width;
  const bottom = 100 - r.y - r.height;
  const left = r.x;
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
}

function shrinkCropSides(r: ImageCropRect, pct: number): ImageCropRect {
  return clampCropRect({
    x: r.x + pct,
    y: r.y + pct,
    width: r.width - pct * 2,
    height: r.height - pct * 2,
  });
}

function centerCropSize(sizePct: number): ImageCropRect {
  const margin = (100 - sizePct) / 2;
  return clampCropRect({ x: margin, y: margin, width: sizePct, height: sizePct });
}

const CROP_HANDLES: Array<{ id: string; mode: DragMode; className: string }> = [
  { id: 'n', mode: 'resize-crop-n', className: 'left-1/2 top-0 h-3 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize rounded-full' },
  { id: 's', mode: 'resize-crop-s', className: 'left-1/2 bottom-0 h-3 w-12 -translate-x-1/2 translate-y-1/2 cursor-ns-resize rounded-full' },
  { id: 'e', mode: 'resize-crop-e', className: 'right-0 top-1/2 h-12 w-3 translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full' },
  { id: 'w', mode: 'resize-crop-w', className: 'left-0 top-1/2 h-12 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full' },
  { id: 'ne', mode: 'resize-crop-ne', className: 'right-0 top-0 h-5 w-5 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize rounded-full' },
  { id: 'nw', mode: 'resize-crop-nw', className: 'left-0 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize rounded-full' },
  { id: 'se', mode: 'resize-crop-se', className: 'right-0 bottom-0 h-5 w-5 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full' },
  { id: 'sw', mode: 'resize-crop-sw', className: 'left-0 bottom-0 h-5 w-5 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize rounded-full' },
];

const BBOX_CORNERS = ['nw', 'ne', 'se', 'sw'] as const;

const BBOX_CORNER_CLASS: Record<(typeof BBOX_CORNERS)[number], string> = {
  nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  se: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-se-resize',
  sw: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
};

function circleBoxPct(a: StepAnnotation): { left: number; top: number; size: number } {
  const size = a.size ?? 8;
  const half = size / 2;
  return { left: a.x - half, top: a.y - half, size };
}

function renderBBoxHandles(onResize: (e: React.PointerEvent) => void) {
  return BBOX_CORNERS.map((corner) => (
    <div
      key={corner}
      data-handle
      className={`absolute z-30 h-6 w-6 rounded-full bg-primary-500 shadow ring-2 ring-white ${BBOX_CORNER_CLASS[corner]}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onResize(e);
      }}
    />
  ));
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return Math.sqrt((px - nx) ** 2 + (py - ny) ** 2);
}

function newTextAnnotation(x: number, y: number, text: string): StepAnnotation {
  return {
    id: crypto.randomUUID(),
    kind: 'text',
    x,
    y,
    text,
    ...DEFAULT_TEXT_STYLE,
    boxWidthPct: 28,
    boxHeightPct: 8,
  };
}

function hexFromColor(c: string): string {
  if (c.startsWith('#')) return c.slice(0, 7);
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return '#000000';
  const r = Number(m[1]).toString(16).padStart(2, '0');
  const g = Number(m[2]).toString(16).padStart(2, '0');
  const b = Number(m[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function alphaFromBg(c: string): number {
  const m = c.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  return m ? Math.round(Number(m[1]) * 100) : 95;
}

function rgbaFromHex(hex: string, alphaPct: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${(alphaPct / 100).toFixed(2)})`;
}

export default function StepScreenEditor({
  screenshotUrl,
  manualId,
  stepId,
  stepOrder,
  previousStepId,
  nextStepId,
  masks,
  annotations,
  imageBorderColor,
  imageBorderWidth,
  onSave,
  onSaveAndNext,
  onClose,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inspectorTextRef = useRef<HTMLTextAreaElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointRef = useRef<OverlayPoint | null>(null);
  const draftCircleRef = useRef<{ cx: number; cy: number; r: number } | null>(null);
  const draftArrowRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const currentRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [localMasks, setLocalMasks] = useState(masks);
  const [localAnn, setLocalAnn] = useState(annotations);
  const [tool, setTool] = useState<Tool>('select');
  const [selection, setSelection] = useState<Selection>(null);
  const [current, setCurrent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [draftCircle, setDraftCircle] = useState<{ cx: number; cy: number; r: number } | null>(null);
  const [draftArrow, setDraftArrow] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [pendingText, setPendingText] = useState<{ x: number; y: number; id?: string } | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [textDraftStyle, setTextDraftStyle] = useState(DEFAULT_TEXT_STYLE);
  const [historyState, setHistoryState] = useState<HistoryState>(() => ({
    items: [cloneSnapshot(masks, annotations)],
    index: 0,
  }));
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bgAlpha, setBgAlpha] = useState(95);
  const [defaultStrokeColor, setDefaultStrokeColor] = useState(DEFAULT_STROKE_COLOR);
  const [defaultStrokeWidth, setDefaultStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const [carryOverNext, setCarryOverNext] = useState(() => loadCarryOverPreference(manualId));
  const [cropRect, setCropRect] = useState<ImageCropRect | null>(null);
  const [borderColor, setBorderColor] = useState(imageBorderColor ?? '#94a3b8');
  const [borderWidth, setBorderWidth] = useState(imageBorderWidth ?? 0);
  const [hasClipboard, setHasClipboard] = useState(() => {
    const c = loadOverlayClipboard();
    return c != null && !templateIsEmpty(c);
  });
  const autoAppliedRef = useRef(false);

  const latestTemplate = loadManualOverlayTemplate(manualId);
  const prevStepTemplate =
    previousStepId != null ? loadStepOverlayTemplate(manualId, previousStepId) : null;
  const hasLatestTemplate = latestTemplate != null && !templateIsEmpty(latestTemplate);
  const hasPrevTemplate = prevStepTemplate != null && !templateIsEmpty(prevStepTemplate);

  const canUndo = historyState.index > 0;
  const canRedo = historyState.index < historyState.items.length - 1;

  draftCircleRef.current = draftCircle;
  draftArrowRef.current = draftArrow;
  currentRef.current = current;

  const pushHistoryEntry = useCallback((nextMasks: MaskRect[], nextAnn: StepAnnotation[]) => {
    setHistoryState((s) => {
      const trimmed = s.items.slice(0, s.index + 1);
      const items = [...trimmed, cloneSnapshot(nextMasks, nextAnn)].slice(-30);
      return { items, index: items.length - 1 };
    });
  }, []);

  const applyChange = useCallback(
    (nextMasks: MaskRect[], nextAnn: StepAnnotation[]) => {
      setLocalMasks(nextMasks);
      setLocalAnn(nextAnn);
      pushHistoryEntry(nextMasks, nextAnn);
    },
    [pushHistoryEntry],
  );

  const restoreSnapshot = useCallback((snap: EditorSnapshot) => {
    setLocalMasks(snap.masks.map((m) => ({ ...m })));
    setLocalAnn(snap.annotations.map((a) => ({ ...a })));
    setSelection(null);
  }, []);

  const undo = useCallback(() => {
    setHistoryState((s) => {
      if (s.index <= 0) return s;
      const next = s.index - 1;
      restoreSnapshot(s.items[next]!);
      return { ...s, index: next };
    });
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    setHistoryState((s) => {
      if (s.index >= s.items.length - 1) return s;
      const next = s.index + 1;
      restoreSnapshot(s.items[next]!);
      return { ...s, index: next };
    });
  }, [restoreSnapshot]);

  const duplicateSelection = useCallback(() => {
    if (!selection) return;
    if (selection.kind === 'mask') {
      const m = localMasks.find((x) => x.id === selection.id);
      if (!m) return;
      const copy: MaskRect = { ...m, id: crypto.randomUUID(), x: clampPct(m.x + 2), y: clampPct(m.y + 2) };
      applyChange([...localMasks, copy], localAnn);
      setSelection({ kind: 'mask', id: copy.id });
      return;
    }
    const a = localAnn.find((x) => x.id === selection.id);
    if (!a) return;
    const copy: StepAnnotation = { ...a, id: crypto.randomUUID(), x: clampPct(a.x + 2), y: clampPct(a.y + 2) };
    if (a.kind === 'arrow' && a.endX != null && a.endY != null) {
      copy.endX = clampPct(a.endX + 2);
      copy.endY = clampPct(a.endY + 2);
    }
    applyChange(localMasks, [...localAnn, copy]);
    setSelection({ kind: 'annotation', id: copy.id });
  }, [applyChange, localAnn, localMasks, selection]);

  const persistOverlayTemplate = useCallback(() => {
    const template = buildOverlayTemplate(localMasks, localAnn, {
      defaultStrokeColor,
      defaultStrokeWidth,
      sourceStepOrder: stepOrder,
    });
    saveManualOverlayTemplate(manualId, template);
    saveStepOverlayTemplate(manualId, stepId, template);
    return template;
  }, [defaultStrokeColor, defaultStrokeWidth, localAnn, localMasks, manualId, stepId, stepOrder]);

  const applyTemplateDefaults = useCallback((template: ScreenEditorOverlayTemplate) => {
    if (template.defaultStrokeColor) setDefaultStrokeColor(template.defaultStrokeColor);
    if (template.defaultStrokeWidth != null) setDefaultStrokeWidth(template.defaultStrokeWidth);
  }, []);

  const applyLayoutTemplate = useCallback(
    (template: ScreenEditorOverlayTemplate, mode: 'replace' | 'merge', clearText = false) => {
      if (templateIsEmpty(template)) return;
      const applied = applyOverlayTemplate(template, { stepOrder, clearText });
      applyTemplateDefaults(template);
      if (mode === 'replace') {
        applyChange(applied.masks, applied.annotations);
      } else {
        applyChange([...localMasks, ...applied.masks], [...localAnn, ...applied.annotations]);
      }
      setSelection(null);
    },
    [applyChange, applyTemplateDefaults, localAnn, localMasks, stepOrder],
  );

  const confirmAndApply = useCallback(
    (template: ScreenEditorOverlayTemplate, mode: 'replace' | 'merge', clearText = false) => {
      const isEmpty = localMasks.length === 0 && localAnn.length === 0;
      if (isEmpty || mode === 'merge') {
        applyLayoutTemplate(template, mode, clearText);
        return;
      }
      if (window.confirm('現在の編集内容を置き換えてレイアウトを適用しますか？')) {
        applyLayoutTemplate(template, 'replace', clearText);
      }
    },
    [applyLayoutTemplate, localAnn.length, localMasks.length],
  );

  const copyLayoutToClipboard = useCallback(() => {
    let template: ScreenEditorOverlayTemplate;
    if (selection?.kind === 'mask') {
      const m = localMasks.find((x) => x.id === selection.id);
      if (!m) return;
      template = buildOverlayTemplate([m], [], { defaultStrokeColor, defaultStrokeWidth, sourceStepOrder: stepOrder });
    } else if (selection?.kind === 'annotation') {
      const a = localAnn.find((x) => x.id === selection.id);
      if (!a) return;
      template = buildOverlayTemplate([], [a], { defaultStrokeColor, defaultStrokeWidth, sourceStepOrder: stepOrder });
    } else {
      template = persistOverlayTemplate();
    }
    saveOverlayClipboard(template);
    setHasClipboard(!templateIsEmpty(template));
  }, [defaultStrokeColor, defaultStrokeWidth, localAnn, localMasks, persistOverlayTemplate, selection, stepOrder]);

  const pasteLayoutFromClipboard = useCallback(() => {
    const template = loadOverlayClipboard();
    if (!template || templateIsEmpty(template)) return;
    const isEmpty = localMasks.length === 0 && localAnn.length === 0;
    applyLayoutTemplate(template, isEmpty ? 'replace' : 'merge');
  }, [applyLayoutTemplate, localAnn.length, localMasks.length]);

  const selectedTextAnn =
    selection?.kind === 'annotation'
      ? localAnn.find((a) => a.id === selection.id && a.kind === 'text')
      : undefined;

  const selectedShapeAnn =
    selection?.kind === 'annotation'
      ? localAnn.find(
          (a) => a.id === selection.id && (a.kind === 'circle' || a.kind === 'arrow' || a.kind === 'badge'),
        )
      : undefined;

  const updateSelectedTextStyle = useCallback(
    (patch: Partial<StepAnnotation>) => {
      if (!selection || selection.kind !== 'annotation') return;
      const next = localAnn.map((a) => (a.id === selection.id ? { ...a, ...patch } : a));
      applyChange(localMasks, next);
    },
    [applyChange, localAnn, localMasks, selection],
  );

  const updateSelectedShapeStyle = useCallback(
    (patch: Partial<StepAnnotation>) => {
      if (!selection || selection.kind !== 'annotation') return;
      const next = localAnn.map((a) => (a.id === selection.id ? { ...a, ...patch } : a));
      applyChange(localMasks, next);
    },
    [applyChange, localAnn, localMasks, selection],
  );

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setBox({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (masks.length > 0 || annotations.length > 0) return;
    if (!consumeAutoApplyLayout(manualId)) return;
    const template = loadManualOverlayTemplate(manualId);
    if (!template || templateIsEmpty(template)) return;
    autoAppliedRef.current = true;
    const applied = applyOverlayTemplate(template, { stepOrder });
    applyTemplateDefaults(template);
    setLocalMasks(applied.masks);
    setLocalAnn(applied.annotations);
    setHistoryState({ items: [cloneSnapshot(applied.masks, applied.annotations)], index: 0 });
  }, [annotations.length, applyTemplateDefaults, manualId, masks.length, stepOrder]);

  useEffect(() => {
    if (pendingText || selectedTextAnn) {
      requestAnimationFrame(() => {
        inspectorTextRef.current?.focus();
      });
    }
  }, [pendingText?.id, pendingText?.x, selectedTextAnn?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;

      if (pendingText) {
        if (e.key === 'Escape') {
          setPendingText(null);
          setTextDraft('');
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copyLayoutToClipboard();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteLayoutFromClipboard();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selection) return;
        e.preventDefault();
        if (selection.kind === 'mask') {
          applyChange(
            localMasks.filter((m) => m.id !== selection.id),
            localAnn,
          );
        } else {
          applyChange(
            localMasks,
            localAnn.filter((a) => a.id !== selection.id),
          );
        }
        setSelection(null);
      }
      if (e.key === 'Escape') {
        setSelection(null);
        setTool('select');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyChange, copyLayoutToClipboard, duplicateSelection, localAnn, localMasks, pasteLayoutFromClipboard, pendingText, redo, selection, undo]);

  const pointInOverlay = useCallback((clientX: number, clientY: number): OverlayPoint | null => {
    const el = overlayRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    return { x, y, boxW: rect.width, boxH: rect.height, pctX: (x / rect.width) * 100, pctY: (y / rect.height) * 100 };
  }, []);

  const maskTypeFromTool = (): MaskStyle => {
    if (tool === 'mask-mosaic') return 'pixelate';
    if (tool === 'mask-blur') return 'blur';
    if (tool === 'mask-highlight') return 'highlight';
    return 'black';
  };

  const hitTest = useCallback(
    (p: OverlayPoint): Selection => {
      for (let i = localAnn.length - 1; i >= 0; i--) {
        const a = localAnn[i]!;
        if (a.kind === 'text') {
          const box = estimateTextBox(a, p.boxW, p.boxH);
          if (p.x >= box.left && p.x <= box.left + box.width && p.y >= box.top && p.y <= box.top + box.height) {
            return { kind: 'annotation', id: a.id };
          }
        }
        if (a.kind === 'circle' || a.kind === 'badge') {
          const cx = pctToPx(a.x, p.boxW);
          const cy = pctToPx(a.y, p.boxH);
          const r = pctToPx((a.size ?? 8) / 2, Math.min(p.boxW, p.boxH));
          if (Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2) <= r + 10) {
            return { kind: 'annotation', id: a.id };
          }
        }
        if (a.kind === 'arrow' && a.endX != null && a.endY != null) {
          const x1 = pctToPx(a.x, p.boxW);
          const y1 = pctToPx(a.y, p.boxH);
          const x2 = pctToPx(a.endX, p.boxW);
          const y2 = pctToPx(a.endY, p.boxH);
          if (distanceToSegment(p.x, p.y, x1, y1, x2, y2) < 14) {
            return { kind: 'annotation', id: a.id };
          }
        }
      }
      for (let i = localMasks.length - 1; i >= 0; i--) {
        const m = localMasks[i]!;
        const mx = pctToPx(m.x, p.boxW);
        const my = pctToPx(m.y, p.boxH);
        const mw = pctToPx(m.width, p.boxW);
        const mh = pctToPx(m.height, p.boxH);
        if (p.x >= mx && p.x <= mx + mw && p.y >= my && p.y <= my + mh) {
          return { kind: 'mask', id: m.id };
        }
      }
      return null;
    },
    [localAnn, localMasks],
  );

  const applyDragPoint = useCallback((p: OverlayPoint) => {
    const session = dragSessionRef.current;
    if (!session) return;

    const dPctX = p.pctX - session.startPctX;
    const dPctY = p.pctY - session.startPctY;
    const snap = session.snapshot;

    if (session.startCropRect) {
      const start = session.startCropRect;
      let next = { ...start };
      switch (session.mode) {
        case 'move-crop':
          next.x = start.x + dPctX;
          next.y = start.y + dPctY;
          break;
        case 'resize-crop-e':
          next.width = start.width + dPctX;
          break;
        case 'resize-crop-w':
          next.x = start.x + dPctX;
          next.width = start.width - dPctX;
          break;
        case 'resize-crop-s':
          next.height = start.height + dPctY;
          break;
        case 'resize-crop-n':
          next.y = start.y + dPctY;
          next.height = start.height - dPctY;
          break;
        case 'resize-crop-se':
          next.width = start.width + dPctX;
          next.height = start.height + dPctY;
          break;
        case 'resize-crop-sw':
          next.x = start.x + dPctX;
          next.width = start.width - dPctX;
          next.height = start.height + dPctY;
          break;
        case 'resize-crop-ne':
          next.y = start.y + dPctY;
          next.width = start.width + dPctX;
          next.height = start.height - dPctY;
          break;
        case 'resize-crop-nw':
          next.x = start.x + dPctX;
          next.y = start.y + dPctY;
          next.width = start.width - dPctX;
          next.height = start.height - dPctY;
          break;
        default:
          return;
      }
      setCropRect(clampCropRect(next));
      return;
    }

    if (session.mode === 'create-circle') {
      const dx = p.x - session.startX;
      const dy = p.y - session.startY;
      const rPx = Math.sqrt(dx * dx + dy * dy);
      const rPct = (rPx / Math.min(p.boxW, p.boxH)) * 100 * 2;
      setDraftCircle({ cx: session.startPctX, cy: session.startPctY, r: rPct });
      return;
    }

    if (session.mode === 'create-arrow') {
      setDraftArrow({ x1: session.startPctX, y1: session.startPctY, x2: p.pctX, y2: p.pctY });
      return;
    }

    if (session.mode === 'create-mask' || session.mode === 'create-crop') {
      const x = Math.min(session.startX, p.x);
      const y = Math.min(session.startY, p.y);
      setCurrent({ x, y, w: Math.abs(p.x - session.startX), h: Math.abs(p.y - session.startY) });
      return;
    }

    if (session.mode === 'move-mask' && session.selection?.kind === 'mask') {
      const orig = snap.masks.find((m) => m.id === session.selection!.id);
      if (!orig) return;
      setLocalMasks((list) =>
        list.map((m) =>
          m.id === orig.id ? { ...m, x: clampPct(orig.x + dPctX), y: clampPct(orig.y + dPctY) } : m,
        ),
      );
      return;
    }

    if (session.mode === 'move-annotation' && session.selection?.kind === 'annotation') {
      const orig = snap.annotations.find((a) => a.id === session.selection!.id);
      if (!orig) return;
      setLocalAnn((list) =>
        list.map((a) => {
          if (a.id !== orig.id) return a;
          const next = { ...a, x: clampPct(orig.x + dPctX), y: clampPct(orig.y + dPctY) };
          if (a.kind === 'arrow' && orig.endX != null && orig.endY != null) {
            next.endX = clampPct(orig.endX + dPctX);
            next.endY = clampPct(orig.endY + dPctY);
          }
          return next;
        }),
      );
      return;
    }

    if (session.mode === 'resize-mask' && session.selection?.kind === 'mask') {
      const orig = snap.masks.find((m) => m.id === session.selection!.id);
      if (!orig) return;
      const mx = pctToPx(orig.x, p.boxW);
      const my = pctToPx(orig.y, p.boxH);
      const nw = Math.max(12, p.x - mx);
      const nh = Math.max(12, p.y - my);
      const pct = pxToPercent(mx, my, nw, nh, p.boxW, p.boxH);
      setLocalMasks((list) => list.map((m) => (m.id === orig.id ? { ...m, ...pct } : m)));
      return;
    }

    if (session.mode === 'resize-circle' && session.selection?.kind === 'annotation') {
      const orig = snap.annotations.find((a) => a.id === session.selection!.id);
      if (!orig || (orig.kind !== 'circle' && orig.kind !== 'badge')) return;
      const cx = pctToPx(orig.x, p.boxW);
      const cy = pctToPx(orig.y, p.boxH);
      const rPx = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      const size = (rPx / Math.min(p.boxW, p.boxH)) * 100 * 2;
      setLocalAnn((list) => list.map((a) => (a.id === orig.id ? { ...a, size: Math.max(2, size) } : a)));
      return;
    }

    if (session.mode === 'resize-arrow-start' && session.selection?.kind === 'annotation') {
      const orig = snap.annotations.find((a) => a.id === session.selection!.id);
      if (!orig || orig.kind !== 'arrow') return;
      setLocalAnn((list) => list.map((a) => (a.id === orig.id ? { ...a, x: p.pctX, y: p.pctY } : a)));
      return;
    }

    if (session.mode === 'resize-arrow-end' && session.selection?.kind === 'annotation') {
      const orig = snap.annotations.find((a) => a.id === session.selection!.id);
      if (!orig || orig.kind !== 'arrow') return;
      setLocalAnn((list) => list.map((a) => (a.id === orig.id ? { ...a, endX: p.pctX, endY: p.pctY } : a)));
      return;
    }

    if (session.mode === 'resize-text-box' && session.selection?.kind === 'annotation') {
      const orig = snap.annotations.find((a) => a.id === session.selection!.id);
      if (!orig || orig.kind !== 'text') return;
      const startW = session.startBoxWPct ?? defaultBoxSizePct(orig, p.boxW, p.boxH).w;
      const startH = session.startBoxHPct ?? defaultBoxSizePct(orig, p.boxW, p.boxH).h;
      const newW = Math.max(6, Math.min(90, startW + (p.pctX - session.startPctX)));
      const newH = Math.max(2, Math.min(60, startH + (p.pctY - session.startPctY)));
      setLocalAnn((list) =>
        list.map((a) => (a.id === orig.id ? { ...a, boxWidthPct: newW, boxHeightPct: newH } : a)),
      );
    }
  }, []);

  const scheduleDragPoint = useCallback(
    (clientX: number, clientY: number) => {
      const p = pointInOverlay(clientX, clientY);
      if (!p) return;
      pendingPointRef.current = p;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingPointRef.current) applyDragPoint(pendingPointRef.current);
      });
    },
    [applyDragPoint, pointInOverlay],
  );

  const endDrag = useCallback(() => {
    const session = dragSessionRef.current;
    if (!session) return;

    const circleDraft = draftCircleRef.current;
    const arrowDraft = draftArrowRef.current;
    const maskDraft = currentRef.current;

    if (session.mode === 'create-circle' && circleDraft && circleDraft.r > 1) {
      const nextAnn = [
        ...localAnn,
        {
          id: crypto.randomUUID(),
          kind: 'circle' as const,
          x: circleDraft.cx,
          y: circleDraft.cy,
          size: circleDraft.r,
          strokeColor: defaultStrokeColor,
          strokeWidth: defaultStrokeWidth,
        },
      ];
      applyChange(localMasks, nextAnn);
      setSelection({ kind: 'annotation', id: nextAnn[nextAnn.length - 1]!.id });
    } else if (session.mode === 'create-arrow' && arrowDraft) {
      const dx = Math.abs(arrowDraft.x2 - arrowDraft.x1);
      const dy = Math.abs(arrowDraft.y2 - arrowDraft.y1);
      if (dx > 0.3 || dy > 0.3) {
        const nextAnn = [
          ...localAnn,
          {
            id: crypto.randomUUID(),
            kind: 'arrow' as const,
            x: arrowDraft.x1,
            y: arrowDraft.y1,
            endX: arrowDraft.x2,
            endY: arrowDraft.y2,
            strokeColor: defaultStrokeColor,
            strokeWidth: defaultStrokeWidth,
          },
        ];
        applyChange(localMasks, nextAnn);
        setSelection({ kind: 'annotation', id: nextAnn[nextAnn.length - 1]!.id });
      }
    } else if (session.mode === 'create-crop' && maskDraft && maskDraft.w > 6 && maskDraft.h > 6) {
      const p = pointInOverlay(session.startX, session.startY);
      const boxW = p?.boxW ?? box.w;
      const boxH = p?.boxH ?? box.h;
      const pct = pxToPercent(maskDraft.x, maskDraft.y, maskDraft.w, maskDraft.h, boxW, boxH);
      setCropRect(pct);
    } else if (session.mode === 'create-mask' && maskDraft && maskDraft.w > 6 && maskDraft.h > 6) {
      const p = pointInOverlay(session.startX, session.startY);
      const boxW = p?.boxW ?? box.w;
      const boxH = p?.boxH ?? box.h;
      const pct = pxToPercent(maskDraft.x, maskDraft.y, maskDraft.w, maskDraft.h, boxW, boxH);
      const nextMasks = [
        ...localMasks,
        { id: crypto.randomUUID(), ...pct, type: session.maskType ?? 'black' },
      ];
      applyChange(nextMasks, localAnn);
      setSelection({ kind: 'mask', id: nextMasks[nextMasks.length - 1]!.id });
    } else if (
      [
        'move-mask',
        'move-annotation',
        'resize-mask',
        'resize-circle',
        'resize-arrow-start',
        'resize-arrow-end',
        'resize-text-box',
      ].includes(session.mode)
    ) {
      pushHistoryEntry(localMasks, localAnn);
    }

    dragSessionRef.current = null;
    setIsDragging(false);
    setCurrent(null);
    setDraftCircle(null);
    setDraftArrow(null);
  }, [applyChange, box.h, box.w, defaultStrokeColor, defaultStrokeWidth, localAnn, localMasks, pointInOverlay, pushHistoryEntry]);

  const startDrag = useCallback(
    (mode: DragMode, e: React.PointerEvent, sel: Selection | null, maskType?: MaskStyle) => {
      const p = pointInOverlay(e.clientX, e.clientY);
      if (!p) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

      const session: DragSession = {
        mode,
        pointerId: e.pointerId,
        startPctX: p.pctX,
        startPctY: p.pctY,
        startX: p.x,
        startY: p.y,
        snapshot: cloneSnapshot(localMasks, localAnn),
        selection: sel,
        maskType,
      };

      if (mode === 'resize-text-box' && sel?.kind === 'annotation') {
        const ann = localAnn.find((a) => a.id === sel.id && a.kind === 'text');
        if (ann) {
          const def = defaultBoxSizePct(ann, p.boxW, p.boxH);
          session.startBoxWPct = ann.boxWidthPct ?? def.w;
          session.startBoxHPct = ann.boxHeightPct ?? def.h;
        }
      }

      if (mode === 'move-crop' || mode.startsWith('resize-crop-')) {
        if (!cropRect) return;
        session.startCropRect = { ...cropRect };
      }

      dragSessionRef.current = session;
      setIsDragging(true);
      if (sel) setSelection(sel);
    },
    [localAnn, localMasks, pointInOverlay, cropRect],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragSessionRef.current) return;
      scheduleDragPoint(e.clientX, e.clientY);
    };
    const onUp = () => endDrag();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [endDrag, scheduleDragPoint]);

  const onOverlayPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-handle],[data-del],[data-text-input],[data-inspector],[data-shape-hit]')) {
      return;
    }
    const p = pointInOverlay(e.clientX, e.clientY);
    if (!p) return;

    if (tool === 'text') {
      setPendingText({ x: p.pctX, y: p.pctY });
      setTextDraft('');
      setTextDraftStyle(DEFAULT_TEXT_STYLE);
      setSelection(null);
      return;
    }

    if (tool === 'badge') {
      const ann: StepAnnotation = {
        id: crypto.randomUUID(),
        kind: 'badge',
        x: p.pctX,
        y: p.pctY,
        text: nextBadgeLabel(localAnn, stepOrder),
        size: 8,
        fillColor: DEFAULT_BADGE_FILL,
        strokeColor: DEFAULT_BADGE_FILL,
        strokeWidth: 0,
        textColor: '#ffffff',
      };
      applyChange(localMasks, [...localAnn, ann]);
      setSelection({ kind: 'annotation', id: ann.id });
      return;
    }

    if (tool === 'select') {
      const hit = hitTest(p);
      setSelection(hit);
      if (hit) startDrag(hit.kind === 'mask' ? 'move-mask' : 'move-annotation', e, hit);
      return;
    }

    setSelection(null);
    if (tool === 'crop') {
      if (cropRect) {
        const inside =
          p.pctX >= cropRect.x &&
          p.pctX <= cropRect.x + cropRect.width &&
          p.pctY >= cropRect.y &&
          p.pctY <= cropRect.y + cropRect.height;
        if (inside) {
          startDrag('move-crop', e, null);
          return;
        }
      }
      startDrag('create-crop', e, null);
      return;
    }
    if (tool === 'circle') startDrag('create-circle', e, null);
    else if (tool === 'arrow') startDrag('create-arrow', e, null);
    else startDrag('create-mask', e, null, maskTypeFromTool());
  };

  const commitText = () => {
    const value = textDraft.trim();
    if (pendingText && value) {
      if (pendingText.id) {
        const nextAnn = localAnn.map((a) =>
          a.id === pendingText.id
            ? {
                ...a,
                text: value,
                x: pendingText.x,
                y: pendingText.y,
                fontSize: textDraftStyle.fontSize,
                fontFamily: textDraftStyle.fontFamily,
                fontWeight: textDraftStyle.fontWeight,
                textColor: textDraftStyle.textColor,
                bgColor: textDraftStyle.bgColor,
                borderColor: textDraftStyle.borderColor,
                borderWidth: textDraftStyle.borderWidth,
                boxWidthPct: pendingText.id
                  ? localAnn.find((a) => a.id === pendingText.id)?.boxWidthPct ?? 28
                  : 28,
                boxHeightPct: pendingText.id
                  ? localAnn.find((a) => a.id === pendingText.id)?.boxHeightPct ?? 8
                  : 8,
              }
            : a,
        );
        applyChange(localMasks, nextAnn);
        setSelection({ kind: 'annotation', id: pendingText.id });
      } else {
        const ann = newTextAnnotation(pendingText.x, pendingText.y, value);
        ann.fontSize = textDraftStyle.fontSize;
        ann.fontFamily = textDraftStyle.fontFamily;
        ann.fontWeight = textDraftStyle.fontWeight;
        ann.textColor = textDraftStyle.textColor;
        ann.bgColor = textDraftStyle.bgColor;
        ann.borderColor = textDraftStyle.borderColor;
        ann.borderWidth = textDraftStyle.borderWidth;
        applyChange(localMasks, [...localAnn, ann]);
        setSelection({ kind: 'annotation', id: ann.id });
      }
    } else if (pendingText?.id) {
      applyChange(
        localMasks,
        localAnn.filter((a) => a.id !== pendingText.id),
      );
      setSelection(null);
    }
    setPendingText(null);
    setTextDraft('');
  };

  const openTextEdit = (a: StepAnnotation) => {
    const s = textStyleOf(a);
    setPendingText({ x: a.x, y: a.y, id: a.id });
    setTextDraft(a.text ?? '');
    setTextDraftStyle({
      fontSize: s.fontSize,
      fontFamily: s.fontFamily,
      fontWeight: s.fontWeight,
      textColor: s.textColor,
      bgColor: s.bgColor,
      borderColor: s.borderColor,
      borderWidth: s.borderWidth,
    });
    setTool('select');
  };

  const applyStylePatch = (patch: Partial<TextStylePreset>) => {
    if (pendingText) {
      setTextDraftStyle((s) => ({ ...s, ...patch }));
      return;
    }
    if (selectedTextAnn) updateSelectedTextStyle(patch);
  };

  const applyCalloutPreset = (preset: TextStylePreset) => {
    applyStylePatch(stylePresetToAnnotationPatch(preset));
  };

  const activeStyle = pendingText
    ? textDraftStyle
    : selectedTextAnn
      ? textStyleOf(selectedTextAnn)
      : null;

  const activeText = pendingText ? textDraft : (selectedTextAnn?.text ?? '');

  useEffect(() => {
    if (activeStyle?.bgColor) setBgAlpha(alphaFromBg(activeStyle.bgColor));
  }, [activeStyle?.bgColor, selectedTextAnn?.id, pendingText?.id]);

  const renderMask = (m: MaskRect) => {
    const selected = selection?.kind === 'mask' && selection.id === m.id;
    const style = isPercentMask(m)
      ? { left: `${m.x}%`, top: `${m.y}%`, width: `${m.width}%`, height: `${m.height}%` }
      : { left: m.x, top: m.y, width: m.width, height: m.height };

    return (
      <div
        key={m.id}
        className={`group absolute transition-shadow ${maskStyleClass(m.type)} ${selected ? 'z-10 ring-2 ring-primary-400 ring-offset-1' : ''}`}
        style={style}
        onPointerDown={(e) => {
          if (tool !== 'select') return;
          startDrag('move-mask', e, { kind: 'mask', id: m.id });
        }}
      >
        {selected && (
          <>
            <div className="pointer-events-none absolute inset-0 border border-dashed border-primary-300/80" />
            <div
              data-handle
              className="absolute bottom-0 right-0 z-20 h-5 w-5 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full bg-primary-500 shadow ring-2 ring-white"
              onPointerDown={(e) => startDrag('resize-mask', e, { kind: 'mask', id: m.id })}
            />
          </>
        )}
        <button
          type="button"
          data-del
          className="absolute -right-2 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-danger-600 text-white opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => {
            applyChange(
              localMasks.filter((x) => x.id !== m.id),
              localAnn,
            );
            if (selection?.kind === 'mask' && selection.id === m.id) setSelection(null);
          }}
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  const renderCircleInteractive = (a: StepAnnotation) => {
    const selected = selection?.kind === 'annotation' && selection.id === a.id;
    const sel = { kind: 'annotation' as const, id: a.id };
    const { left, top, size } = circleBoxPct(a);

    return (
      <div
        key={`circle-hit-${a.id}`}
        data-shape-hit
        className={`absolute ${selected ? 'z-20' : 'z-10'}`}
        style={{ left: `${left}%`, top: `${top}%`, width: `${size}%`, aspectRatio: '1' }}
      >
        <div
          className={`h-full w-full rounded-full ${
            tool === 'select' ? 'cursor-move' : ''
          } ${selected ? 'ring-2 ring-primary-400 ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-primary-300/60'}`}
          onPointerDown={(e) => {
            if (tool !== 'select' || pendingText) return;
            e.stopPropagation();
            setSelection(sel);
            startDrag('move-annotation', e, sel);
          }}
        />
        {selected && (
          <>
            <div className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-primary-300/90" />
            {renderBBoxHandles((e) => startDrag('resize-circle', e, sel))}
          </>
        )}
      </div>
    );
  };

  const renderArrowInteractive = () => {
    if (box.w <= 0 || box.h <= 0) return null;

    return (
      <svg
        className="absolute inset-0 z-10 h-full w-full"
        viewBox={`0 0 ${box.w} ${box.h}`}
        preserveAspectRatio="none"
        style={{ pointerEvents: 'none' }}
      >
        {localAnn
          .filter((a) => a.kind === 'arrow' && a.endX != null && a.endY != null)
          .sort((a, b) => {
            const aSel = selection?.kind === 'annotation' && selection.id === a.id;
            const bSel = selection?.kind === 'annotation' && selection.id === b.id;
            if (aSel && !bSel) return 1;
            if (!aSel && bSel) return -1;
            return 0;
          })
          .map((a) => {
            const selected = selection?.kind === 'annotation' && selection.id === a.id;
            const sel = { kind: 'annotation' as const, id: a.id };
            const x1 = pctToPx(a.x, box.w);
            const y1 = pctToPx(a.y, box.h);
            const x2 = pctToPx(a.endX!, box.w);
            const y2 = pctToPx(a.endY!, box.h);
            const hitW = Math.max(28, strokeDisplayPx(a, box.w) + 24);
            const pad = 14;
            const bx = Math.min(x1, x2) - pad;
            const by = Math.min(y1, y2) - pad;
            const bw = Math.max(Math.abs(x2 - x1) + pad * 2, 24);
            const bh = Math.max(Math.abs(y2 - y1) + pad * 2, 24);

            return (
              <g key={`arrow-hit-${a.id}`} data-shape-hit style={{ pointerEvents: 'auto' }}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={hitW}
                  style={{ cursor: tool === 'select' ? 'move' : undefined }}
                  onPointerDown={(e) => {
                    if (tool !== 'select' || pendingText) return;
                    e.stopPropagation();
                    setSelection(sel);
                    startDrag('move-annotation', e, sel);
                  }}
                />
                {selected && (
                  <>
                    <rect
                      x={bx}
                      y={by}
                      width={bw}
                      height={bh}
                      fill="none"
                      stroke="rgba(147,197,253,0.95)"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      pointerEvents="none"
                    />
                    <circle
                      data-handle
                      cx={x1}
                      cy={y1}
                      r={11}
                      fill="white"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag('resize-arrow-start', e, sel);
                      }}
                    />
                    <circle
                      data-handle
                      cx={x2}
                      cy={y2}
                      r={11}
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth={2.5}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag('resize-arrow-end', e, sel);
                      }}
                    />
                  </>
                )}
              </g>
            );
          })}
      </svg>
    );
  };

  const renderSvgAnnotations = () => {
    if (box.w <= 0 || box.h <= 0) return null;
    const defaultStroke = Math.max(3, box.w / 280);
    const lines: StepAnnotation[] = [
      ...localAnn.filter((a) => a.kind === 'arrow'),
      ...(draftArrow
        ? [
            {
              id: '_draft',
              kind: 'arrow' as const,
              x: draftArrow.x1,
              y: draftArrow.y1,
              endX: draftArrow.x2,
              endY: draftArrow.y2,
              strokeColor: defaultStrokeColor,
              strokeWidth: defaultStrokeWidth,
            },
          ]
        : []),
    ];

    const arrowHead = (x1: number, y1: number, x2: number, y2: number, head: number) => {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const p2x = x2 - head * Math.cos(angle - Math.PI / 6);
      const p2y = y2 - head * Math.sin(angle - Math.PI / 6);
      const p3x = x2 - head * Math.cos(angle + Math.PI / 6);
      const p3y = y2 - head * Math.sin(angle + Math.PI / 6);
      return `${x2},${y2} ${p2x},${p2y} ${p3x},${p3y}`;
    };

    return (
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${box.w} ${box.h}`} preserveAspectRatio="none">
        {localAnn
          .filter((a) => a.kind === 'circle')
          .map((a) => {
            const selected = selection?.kind === 'annotation' && selection.id === a.id;
            const color = strokeColorOf(a);
            const sw = strokeDisplayPx(a, box.w);
            const r = pctToPx((a.size ?? 8) / 2, Math.min(box.w, box.h));
            return (
              <circle
                key={a.id}
                cx={pctToPx(a.x, box.w)}
                cy={pctToPx(a.y, box.h)}
                r={r}
                fill={`${color}22`}
                stroke={color}
                strokeWidth={selected ? sw + 1 : sw}
              />
            );
          })}
        {draftCircle && draftCircle.r > 0 && (
          <circle
            cx={pctToPx(draftCircle.cx, box.w)}
            cy={pctToPx(draftCircle.cy, box.h)}
            r={pctToPx(draftCircle.r / 2, Math.min(box.w, box.h))}
            fill={`${defaultStrokeColor}14`}
            stroke={defaultStrokeColor}
            strokeWidth={defaultStroke}
            strokeDasharray="6 4"
          />
        )}
        {lines.map((a) => {
          if (a.endX == null || a.endY == null) return null;
          const selected = selection?.kind === 'annotation' && selection.id === a.id;
          const color = strokeColorOf(a);
          const sw = strokeDisplayPx(a, box.w);
          const x1 = pctToPx(a.x, box.w);
          const y1 = pctToPx(a.y, box.h);
          const x2 = pctToPx(a.endX, box.w);
          const y2 = pctToPx(a.endY, box.h);
          const head = Math.max(10, sw * 3);
          return (
            <g key={a.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={selected ? sw + 1 : sw}
                strokeLinecap="round"
                strokeDasharray={a.id === '_draft' ? '8 5' : undefined}
              />
              <polygon points={arrowHead(x1, y1, x2, y2, head)} fill={color} />
            </g>
          );
        })}
      </svg>
    );
  };

  const renderBadge = (a: StepAnnotation) => {
    const selected = selection?.kind === 'annotation' && selection.id === a.id;
    const sel = { kind: 'annotation' as const, id: a.id };
    const { left, top, size } = circleBoxPct(a);
    const fill = a.fillColor ?? strokeColorOf(a);
    const fontPx = Math.max(10, pctToPx(size * 0.52, Math.min(box.w, box.h)));

    return (
      <div
        key={a.id}
        data-shape-hit
        className={`absolute ${selected ? 'z-20' : 'z-10'}`}
        style={{ left: `${left}%`, top: `${top}%`, width: `${size}%`, aspectRatio: '1' }}
      >
        <div
          className={`flex h-full w-full cursor-move items-center justify-center rounded-full font-bold shadow transition-shadow ${
            selected ? 'ring-2 ring-primary-400 ring-offset-1' : ''
          }`}
          style={{
            backgroundColor: fill,
            color: a.textColor ?? '#ffffff',
            fontSize: fontPx,
          }}
          onPointerDown={(e) => {
            if (tool !== 'select' || pendingText) return;
            e.stopPropagation();
            setSelection(sel);
            startDrag('move-annotation', e, sel);
          }}
        >
          {a.text ?? '1'}
        </div>
        {selected && (
          <>
            <div className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-primary-300/90" />
            {renderBBoxHandles((e) => startDrag('resize-circle', e, sel))}
          </>
        )}
        <button
          type="button"
          data-del
          className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-danger-600 text-white opacity-0 transition-opacity hover:opacity-100"
          onClick={() => {
            applyChange(
              localMasks,
              localAnn.filter((x) => x.id !== a.id),
            );
            if (selection?.kind === 'annotation' && selection.id === a.id) setSelection(null);
          }}
        >
          <X size={10} />
        </button>
      </div>
    );
  };

  const updateActiveText = (text: string) => {
    if (pendingText) {
      setTextDraft(text);
      return;
    }
    if (selectedTextAnn) updateSelectedTextStyle({ text });
  };

  const renderText = (a: StepAnnotation) => {
    const selected = selection?.kind === 'annotation' && selection.id === a.id;
    const s = textStyleOf(a);
    const px = textDisplayPx(s.fontSize, box.w);
    const borderPx = borderDisplayPx(s.borderWidth, box.w);
    const boxEst = estimateTextBox(a, box.w, box.h);

    return (
      <div
        key={a.id}
        className="absolute"
        style={{ left: boxEst.left, top: boxEst.top, width: boxEst.width, minHeight: boxEst.height }}
        onPointerDown={(e) => {
          if (tool !== 'select' || pendingText) return;
          startDrag('move-annotation', e, { kind: 'annotation', id: a.id });
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          openTextEdit(a);
        }}
      >
        <div
          className={`h-full w-full cursor-move overflow-hidden rounded px-2 py-1 shadow transition-shadow ${
            selected ? 'ring-2 ring-primary-400 ring-offset-1' : ''
          }`}
          style={{
            fontSize: px,
            fontFamily: fontFamilyCss(s.fontFamily),
            fontWeight: s.fontWeight,
            color: s.textColor,
            backgroundColor: s.bgColor,
            border: `${borderPx}px solid ${s.borderColor}`,
            lineHeight: 1.35,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {a.text}
        </div>
        {selected && (
          <>
            <div className="pointer-events-none absolute inset-0 border border-dashed border-primary-300/60" />
            <div
              data-handle
              className="absolute bottom-0 right-0 z-20 h-5 w-5 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full bg-primary-500 shadow ring-2 ring-white"
              onPointerDown={(e) => startDrag('resize-text-box', e, { kind: 'annotation', id: a.id })}
            />
          </>
        )}
        <button
          type="button"
          data-del
          className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-danger-600 text-white opacity-0 transition-opacity hover:opacity-100"
          onClick={() => {
            applyChange(
              localMasks,
              localAnn.filter((x) => x.id !== a.id),
            );
            if (selection?.kind === 'annotation' && selection.id === a.id) setSelection(null);
          }}
        >
          <X size={10} />
        </button>
      </div>
    );
  };

  const handleSave = async (andNext = false) => {
    setSaving(true);
    try {
      persistOverlayTemplate();
      if (andNext || carryOverNext) {
        setAutoApplyLayout(manualId, true);
      }

      const blob = await compositeScreenshot(screenshotUrl, localMasks, localAnn, 0.9, {
        crop: cropRect ?? undefined,
        borderColor: borderWidth > 0 ? borderColor : undefined,
        borderWidth: borderWidth > 0 ? borderWidth : undefined,
      });
      const file = new File([blob], 'edited.webp', { type: blob.type || 'image/webp' });
      const newUrl = await uploadStepScreenshot(manualId, stepId, file);
      const result: ScreenEditorSaveResult = {
        masks: [],
        annotations: [],
        screenshotUrl: newUrl,
        imageBorderColor: borderWidth > 0 ? borderColor : '',
        imageBorderWidth: borderWidth > 0 ? borderWidth : 0,
      };

      if (andNext && onSaveAndNext) {
        await onSaveAndNext(result);
      } else {
        onSave(result);
        onClose();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: '選択', icon: <MousePointer2 size={14} /> },
    { id: 'mask-black', label: '黒塗り', icon: <Square size={14} /> },
    { id: 'mask-mosaic', label: 'モザイク', icon: <Square size={14} className="opacity-60" /> },
    { id: 'mask-blur', label: 'ぼかし', icon: <Square size={14} className="blur-[1px]" /> },
    { id: 'mask-highlight', label: '蛍光ペン', icon: <Highlighter size={14} /> },
    { id: 'circle', label: '丸囲み', icon: <Circle size={14} /> },
    { id: 'arrow', label: '矢印', icon: <ArrowRight size={14} /> },
    { id: 'badge', label: '番号', icon: <Hash size={14} /> },
    { id: 'text', label: 'テキスト', icon: <Type size={14} /> },
    { id: 'crop', label: 'トリミング', icon: <Crop size={14} /> },
  ];

  const draftEditorPx = textDisplayPx(textDraftStyle.fontSize, box.w);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Maximize2 size={18} className="text-primary-400" />
          <span className="font-bold">画面編集</span>
          <span className="hidden text-xs text-slate-400 lg:inline">
            選択ツールでドラッグ移動 · 角の●でサイズ変更 · 矢印は端の●で向き・長さを調整
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={!canUndo}
            onClick={undo}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40"
            title="Ctrl+Z"
          >
            <Undo2 size={14} />
            戻す
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={redo}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40"
            title="Ctrl+Shift+Z"
          >
            <Redo2 size={14} />
            やり直し
          </button>
          {nextStepId && onSaveAndNext && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-primary-400 bg-primary-500/20 px-3 py-2 text-sm font-semibold hover:bg-primary-500/30 disabled:opacity-60"
              title="保存して次の手順の編集を開く（レイアウト自動適用）"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
              保存して次へ
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave(false)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold hover:bg-primary-600 disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            保存して閉じる
          </button>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">
            キャンセル
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 px-4 py-2">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTool(t.id);
              if (t.id !== 'select') setSelection(null);
              if (t.id === 'crop' && !cropRect) {
                setCropRect({ x: 0, y: 0, width: 100, height: 100 });
              }
            }}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tool === t.id ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto text-xs text-slate-400 hover:text-white"
          onClick={() => {
            applyChange([], []);
            setSelection(null);
          }}
        >
          すべてクリア
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-700 bg-slate-900/40 px-4 py-2 text-xs text-slate-200">
        <span className="font-semibold text-slate-300">画像調整</span>
        <label className="flex items-center gap-2">
          枠線色
          <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent" />
        </label>
        <label className="flex min-w-[140px] items-center gap-2">
          枠線太さ
          <input type="range" min={0} max={12} value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} className="flex-1 accent-primary-500" />
          <span className="w-6 tabular-nums">{borderWidth}px</span>
        </label>
        {cropRect && (
          <button type="button" onClick={() => setCropRect(null)} className="rounded-lg border border-slate-600 px-2 py-1 font-semibold hover:bg-slate-800">
            トリミング解除
          </button>
        )}
        {tool === 'crop' && cropRect && (
          <>
            <button
              type="button"
              onClick={() => setCropRect((r) => (r ? shrinkCropSides(r, 5) : r))}
              className="rounded-lg border border-slate-600 px-2 py-1 font-semibold hover:bg-slate-800"
            >
              四辺5%削る
            </button>
            <button
              type="button"
              onClick={() => setCropRect(centerCropSize(90))}
              className="rounded-lg border border-slate-600 px-2 py-1 font-semibold hover:bg-slate-800"
            >
              中央90%
            </button>
          </>
        )}
        <span className="text-slate-500">
          {tool === 'crop'
            ? '暗い部分が削除されます。枠の●をドラッグして調整 → 保存で反映'
            : 'トリミングツールで範囲を指定できます'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-900/50 px-4 py-2">
        <Layers size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-300">レイアウト引き継ぎ</span>
        <button
          type="button"
          disabled={!hasLatestTemplate}
          title={hasLatestTemplate && latestTemplate ? templateSummary(latestTemplate) : undefined}
          onClick={() => latestTemplate && confirmAndApply(latestTemplate, 'replace')}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
        >
          前回を適用
        </button>
        <button
          type="button"
          disabled={!hasPrevTemplate}
          title={hasPrevTemplate && prevStepTemplate ? templateSummary(prevStepTemplate) : undefined}
          onClick={() => prevStepTemplate && confirmAndApply(prevStepTemplate, 'replace')}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
        >
          前の手順から
        </button>
        <button
          type="button"
          disabled={!hasLatestTemplate}
          title={hasLatestTemplate && latestTemplate ? templateSummary(latestTemplate) : undefined}
          onClick={() => latestTemplate && confirmAndApply(latestTemplate, 'merge')}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
        >
          前回を重ねる
        </button>
        <button
          type="button"
          disabled={!hasPrevTemplate}
          onClick={() => prevStepTemplate && confirmAndApply(prevStepTemplate, 'replace', true)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          title="位置・スタイルのみ。テキスト枠の文言は空にします"
        >
          スタイルのみ（前手順）
        </button>
        <span className="hidden h-4 w-px bg-slate-600 sm:inline" />
        <button
          type="button"
          onClick={() => copyLayoutToClipboard()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          title="Ctrl+C"
        >
          <Copy size={12} />
          コピー
        </button>
        <button
          type="button"
          disabled={!hasClipboard}
          onClick={() => pasteLayoutFromClipboard()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          title="Ctrl+V"
        >
          <ClipboardPaste size={12} />
          貼り付け
        </button>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={carryOverNext}
            onChange={(e) => {
              const on = e.target.checked;
              setCarryOverNext(on);
              saveCarryOverPreference(manualId, on);
            }}
            className="rounded border-slate-500 accent-primary-500"
          />
          保存時に次の手順へレイアウトを引き継ぐ
        </label>
      </div>

      {(selectedTextAnn || pendingText) && activeStyle && (
        <div
          data-inspector
          className="space-y-3 border-b border-slate-700 bg-slate-900/90 px-4 py-3 text-white"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300">テキスト編集</span>
            {TEXT_CALLOUT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyCalloutPreset(preset)}
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition hover:scale-105"
                style={{
                  color: preset.textColor,
                  backgroundColor: preset.bgColor,
                  borderColor: preset.borderColor,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <textarea
            ref={inspectorTextRef}
            value={activeText}
            onChange={(e) => updateActiveText(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (pendingText && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                commitText();
              }
            }}
            rows={2}
            placeholder="テキストを入力…"
            className="w-full resize-y rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-primary-400 focus:ring-2"
            style={{
              fontFamily: fontFamilyCss(activeStyle.fontFamily),
              fontWeight: activeStyle.fontWeight,
              color: activeStyle.textColor,
              backgroundColor: activeStyle.bgColor,
              borderColor: activeStyle.borderColor,
            }}
          />

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              文字色
              <input
                type="color"
                value={hexFromColor(activeStyle.textColor)}
                onChange={(e) => applyStylePatch({ textColor: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-transparent"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              背景
              <input
                type="color"
                value={hexFromColor(activeStyle.bgColor)}
                onChange={(e) => applyStylePatch({ bgColor: rgbaFromHex(e.target.value, bgAlpha) })}
                className="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-transparent"
              />
              <input
                type="range"
                min={20}
                max={100}
                value={bgAlpha}
                onChange={(e) => {
                  const a = Number(e.target.value);
                  setBgAlpha(a);
                  applyStylePatch({ bgColor: rgbaFromHex(hexFromColor(activeStyle.bgColor), a) });
                }}
                className="w-16 accent-primary-500"
                title="背景の透明度"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              枠線
              <input
                type="color"
                value={hexFromColor(activeStyle.borderColor)}
                onChange={(e) => applyStylePatch({ borderColor: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-transparent"
              />
              <input
                type="range"
                min={0}
                max={8}
                value={activeStyle.borderWidth}
                onChange={(e) => applyStylePatch({ borderWidth: Number(e.target.value) })}
                className="w-14 accent-primary-500"
                title="枠の太さ"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              フォント
              <select
                value={activeStyle.fontFamily}
                onChange={(e) => applyStylePatch({ fontFamily: e.target.value as AnnotationFontFamily })}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[140px] items-center gap-2 text-xs">
              サイズ
              <input
                type="range"
                min={12}
                max={56}
                value={activeStyle.fontSize}
                onChange={(e) => applyStylePatch({ fontSize: Number(e.target.value) })}
                className="flex-1 accent-primary-500"
              />
              <span className="w-6 tabular-nums">{activeStyle.fontSize}</span>
            </label>
            <button
              type="button"
              onClick={() =>
                applyStylePatch({ fontWeight: activeStyle.fontWeight === 'bold' ? 'normal' : 'bold' })
              }
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                activeStyle.fontWeight === 'bold'
                  ? 'border-primary-400 bg-primary-500/30'
                  : 'border-slate-600 bg-slate-800'
              }`}
            >
              <Bold size={12} />
              太字
            </button>
            {selectedTextAnn && !pendingText && (
              <button
                type="button"
                onClick={() => openTextEdit(selectedTextAnn)}
                className="text-xs text-primary-300 hover:text-primary-200"
              >
                キャンバス上で編集
              </button>
            )}
            {pendingText && (
              <button
                type="button"
                onClick={() => commitText()}
                className="rounded-lg bg-primary-500 px-3 py-1 text-xs font-semibold hover:bg-primary-600"
              >
                テキストを確定
              </button>
            )}
            {pendingText && (
              <button
                type="button"
                onClick={() => {
                  setPendingText(null);
                  setTextDraft('');
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                キャンセル
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            ヒント: 右下の●で枠サイズ変更 · Shift+Enterで改行 · 選択中は上の欄で文言を直接編集できます
          </p>
        </div>
      )}

      {selectedShapeAnn && !pendingText && (
        <div
          data-inspector
          className="flex flex-wrap items-center gap-4 border-b border-slate-700 bg-slate-900/90 px-4 py-3 text-white"
        >
          <span className="text-xs font-bold text-slate-300">
            {selectedShapeAnn.kind === 'badge' ? '番号バッジ' : selectedShapeAnn.kind === 'circle' ? '丸囲み' : '矢印'}
          </span>
          {selectedShapeAnn.kind === 'badge' && (
            <label className="flex items-center gap-2 text-xs">
              番号
              <input
                type="text"
                maxLength={3}
                value={selectedShapeAnn.text ?? '1'}
                onChange={(e) => updateSelectedShapeStyle({ text: e.target.value || '1' })}
                className="w-14 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-xs">
            {selectedShapeAnn.kind === 'badge' ? '塗り色' : '線の色'}
            <input
              type="color"
              value={hexFromColor(
                selectedShapeAnn.kind === 'badge'
                  ? (selectedShapeAnn.fillColor ?? DEFAULT_BADGE_FILL)
                  : strokeColorOf(selectedShapeAnn),
              )}
              onChange={(e) => {
                const color = e.target.value;
                setDefaultStrokeColor(color);
                if (selectedShapeAnn.kind === 'badge') {
                  updateSelectedShapeStyle({ fillColor: color, strokeColor: color });
                } else {
                  updateSelectedShapeStyle({ strokeColor: color });
                }
              }}
              className="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-transparent"
            />
          </label>
          {selectedShapeAnn.kind !== 'badge' && (
            <label className="flex min-w-[120px] items-center gap-2 text-xs">
              線の太さ
              <input
                type="range"
                min={1}
                max={12}
                value={selectedShapeAnn.strokeWidth ?? DEFAULT_STROKE_WIDTH}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setDefaultStrokeWidth(w);
                  updateSelectedShapeStyle({ strokeWidth: w });
                }}
                className="flex-1 accent-primary-500"
              />
              <span className="w-4 tabular-nums">{selectedShapeAnn.strokeWidth ?? DEFAULT_STROKE_WIDTH}</span>
            </label>
          )}
          {(selectedShapeAnn.kind === 'circle' || selectedShapeAnn.kind === 'badge') && (
            <label className="flex min-w-[120px] items-center gap-2 text-xs">
              サイズ
              <input
                type="range"
                min={3}
                max={30}
                value={selectedShapeAnn.size ?? 8}
                onChange={(e) => updateSelectedShapeStyle({ size: Number(e.target.value) })}
                className="flex-1 accent-primary-500"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => duplicateSelection()}
            className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs font-semibold hover:bg-slate-800"
          >
            複製 (Ctrl+D)
          </button>
        </div>
      )}

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <div className="relative max-h-full max-w-[min(100%,1400px)]">
          <img
            src={screenshotUrl}
            alt=""
            className="block max-h-[calc(100vh-180px)] w-auto max-w-full select-none"
            draggable={false}
            style={cropRect && tool === 'crop' ? { clipPath: cropInsetClipPath(cropRect) } : undefined}
          />
          <div
            ref={overlayRef}
            className={`absolute inset-0 touch-none select-none ${tool === 'select' && !isDragging ? 'cursor-default' : tool === 'crop' ? 'cursor-crosshair' : 'cursor-crosshair'}`}
            style={{ touchAction: 'none' }}
            onPointerDown={onOverlayPointerDown}
          >
            {tool === 'crop' && cropRect && (
              <>
                <div
                  className="absolute left-0 right-0 top-0 z-10 bg-black/50"
                  style={{ height: `${cropRect.y}%` }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag('create-crop', e, null);
                  }}
                />
                <div
                  className="absolute left-0 right-0 z-10 bg-black/50"
                  style={{ top: `${cropRect.y + cropRect.height}%`, bottom: 0 }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag('create-crop', e, null);
                  }}
                />
                <div
                  className="absolute z-10 bg-black/50"
                  style={{ left: 0, top: `${cropRect.y}%`, width: `${cropRect.x}%`, height: `${cropRect.height}%` }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag('create-crop', e, null);
                  }}
                />
                <div
                  className="absolute z-10 bg-black/50"
                  style={{
                    left: `${cropRect.x + cropRect.width}%`,
                    top: `${cropRect.y}%`,
                    right: 0,
                    height: `${cropRect.height}%`,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag('create-crop', e, null);
                  }}
                />
                <div
                  className="absolute z-20 border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
                  style={{
                    left: `${cropRect.x}%`,
                    top: `${cropRect.y}%`,
                    width: `${cropRect.width}%`,
                    height: `${cropRect.height}%`,
                  }}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest('[data-crop-handle]')) return;
                    e.stopPropagation();
                    startDrag('move-crop', e, null);
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 border border-dashed border-white/70" />
                  {CROP_HANDLES.map((h) => (
                    <div
                      key={h.id}
                      data-crop-handle
                      className={`absolute z-30 bg-primary-500 shadow ring-2 ring-white ${h.className}`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag(h.mode, e, null);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
            {localMasks.map(renderMask)}
            {renderSvgAnnotations()}
            {localAnn.filter((a) => a.kind === 'circle').map(renderCircleInteractive)}
            {renderArrowInteractive()}
            {localAnn.filter((a) => a.kind === 'badge').map(renderBadge)}
            {localAnn.filter((a) => a.kind === 'text' && a.id !== pendingText?.id).map(renderText)}
            {current && current.w > 0 && current.h > 0 && (
              <div
                className="pointer-events-none absolute border-2 border-primary-400 bg-primary-400/20"
                style={{ left: current.x, top: current.y, width: current.w, height: current.h }}
              />
            )}
            {pendingText && (
              <div
                className="pointer-events-none absolute z-20"
                style={{
                  left: `${pendingText.x}%`,
                  top: `${pendingText.y}%`,
                  width: `${pendingText.id ? localAnn.find((a) => a.id === pendingText.id)?.boxWidthPct ?? 28 : 28}%`,
                  minHeight: `${pendingText.id ? localAnn.find((a) => a.id === pendingText.id)?.boxHeightPct ?? 8 : 8}%`,
                  transform: 'translate(-4px,-4px)',
                }}
              >
                <div
                  className="h-full w-full overflow-hidden rounded px-2 py-1 shadow-lg ring-2 ring-primary-400 ring-offset-1"
                  style={{
                    fontSize: draftEditorPx,
                    fontFamily: fontFamilyCss(textDraftStyle.fontFamily),
                    fontWeight: textDraftStyle.fontWeight,
                    color: textDraftStyle.textColor,
                    backgroundColor: textDraftStyle.bgColor,
                    border: `${borderDisplayPx(textDraftStyle.borderWidth, box.w)}px solid ${textDraftStyle.borderColor}`,
                    lineHeight: 1.35,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {textDraft || 'テキスト'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
