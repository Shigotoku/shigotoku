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
  Bold,
} from 'lucide-react';
import { compositeScreenshot } from '../lib/compositeScreenshot';
import {
  DEFAULT_TEXT_STYLE,
  FONT_FAMILIES,
  estimateTextBox,
  fontFamilyCss,
  textDisplayPx,
  textStyleOf,
} from '../lib/annotationTextStyle';
import { uploadStepScreenshot } from '../lib/uploadStepScreenshot';
import type { AnnotationFontFamily, MaskRect, MaskStyle, StepAnnotation } from '../types';

type Tool = 'select' | 'mask-black' | 'mask-mosaic' | 'mask-blur' | 'circle' | 'arrow' | 'text';

export type ScreenEditorSaveResult = {
  masks: MaskRect[];
  annotations: StepAnnotation[];
  screenshotUrl: string;
};

interface Props {
  screenshotUrl: string;
  manualId: string;
  stepId: string;
  masks: MaskRect[];
  annotations: StepAnnotation[];
  onSave: (result: ScreenEditorSaveResult) => void;
  onClose: () => void;
}

type Selection =
  | { kind: 'mask'; id: string }
  | { kind: 'annotation'; id: string }
  | null;

type EditorSnapshot = { masks: MaskRect[]; annotations: StepAnnotation[] };

type DragMode =
  | 'create-mask'
  | 'create-circle'
  | 'create-arrow'
  | 'move-mask'
  | 'move-annotation'
  | 'resize-mask'
  | 'resize-circle'
  | 'resize-arrow-start'
  | 'resize-arrow-end'
  | 'resize-text';

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
  return 'bg-black/90';
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
  };
}

export default function StepScreenEditor({
  screenshotUrl,
  manualId,
  stepId,
  masks,
  annotations,
  onSave,
  onClose,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const textEditRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
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
  const [history, setHistory] = useState<EditorSnapshot[]>([cloneSnapshot(masks, annotations)]);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  draftCircleRef.current = draftCircle;
  draftArrowRef.current = draftArrow;
  currentRef.current = current;

  const pushHistory = useCallback((nextMasks: MaskRect[], nextAnn: StepAnnotation[]) => {
    setHistory((h) => [...h.slice(-29), cloneSnapshot(nextMasks, nextAnn)]);
  }, []);

  const applyChange = useCallback(
    (nextMasks: MaskRect[], nextAnn: StepAnnotation[]) => {
      setLocalMasks(nextMasks);
      setLocalAnn(nextAnn);
      pushHistory(nextMasks, nextAnn);
    },
    [pushHistory],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const prev = h[h.length - 2]!;
      setLocalMasks(prev.masks.map((m) => ({ ...m })));
      setLocalAnn(prev.annotations.map((a) => ({ ...a })));
      setSelection(null);
      return h.slice(0, -1);
    });
  }, []);

  const selectedTextAnn =
    selection?.kind === 'annotation'
      ? localAnn.find((a) => a.id === selection.id && a.kind === 'text')
      : undefined;

  const updateSelectedTextStyle = useCallback(
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
    if (pendingText) {
      requestAnimationFrame(() => {
        const el = textEditRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    }
  }, [pendingText]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pendingText) {
        if (e.key === 'Escape') {
          setPendingText(null);
          setTextDraft('');
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
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
  }, [applyChange, localAnn, localMasks, pendingText, selection, undo]);

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
        if (a.kind === 'circle') {
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

    if (session.mode === 'create-mask') {
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
      if (!orig || orig.kind !== 'circle') return;
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

    if (session.mode === 'resize-text' && session.selection?.kind === 'annotation') {
      const orig = snap.annotations.find((a) => a.id === session.selection!.id);
      if (!orig || orig.kind !== 'text') return;
      const dx = p.x - session.startX;
      const scale = Math.max(0.6, Math.min(3.5, 1 + dx / 120));
      const base = orig.fontSize ?? DEFAULT_TEXT_STYLE.fontSize;
      setLocalAnn((list) =>
        list.map((a) => (a.id === orig.id ? { ...a, fontSize: Math.round(base * scale) } : a)),
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
          },
        ];
        applyChange(localMasks, nextAnn);
        setSelection({ kind: 'annotation', id: nextAnn[nextAnn.length - 1]!.id });
      }
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
        'resize-text',
      ].includes(session.mode)
    ) {
      pushHistory(localMasks, localAnn);
    }

    dragSessionRef.current = null;
    setIsDragging(false);
    setCurrent(null);
    setDraftCircle(null);
    setDraftArrow(null);
  }, [applyChange, box.h, box.w, localAnn, localMasks, pointInOverlay, pushHistory]);

  const startDrag = useCallback(
    (mode: DragMode, e: React.PointerEvent, sel: Selection | null, maskType?: MaskStyle) => {
      const p = pointInOverlay(e.clientX, e.clientY);
      if (!p) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

      dragSessionRef.current = {
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
      setIsDragging(true);
      if (sel) setSelection(sel);
    },
    [localAnn, localMasks, pointInOverlay],
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
    if ((e.target as HTMLElement).closest('[data-handle],[data-del],[data-text-input],[data-inspector]')) return;
    const p = pointInOverlay(e.clientX, e.clientY);
    if (!p) return;

    if (tool === 'text') {
      setPendingText({ x: p.pctX, y: p.pctY });
      setTextDraft('');
      setTextDraftStyle(DEFAULT_TEXT_STYLE);
      setSelection(null);
      return;
    }

    if (tool === 'select') {
      const hit = hitTest(p);
      setSelection(hit);
      if (hit) startDrag(hit.kind === 'mask' ? 'move-mask' : 'move-annotation', e, hit);
      return;
    }

    setSelection(null);
    if (tool === 'circle') startDrag('create-circle', e, null);
    else if (tool === 'arrow') startDrag('create-arrow', e, null);
    else startDrag('create-mask', e, null, maskTypeFromTool());
  };

  const commitText = () => {
    if (composingRef.current) return;
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
    });
  };

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

  const renderSvgAnnotations = () => {
    if (box.w <= 0 || box.h <= 0) return null;
    const stroke = Math.max(3, box.w / 280);
    const lines: StepAnnotation[] = [
      ...localAnn.filter((a) => a.kind === 'arrow'),
      ...(draftArrow
        ? [{ id: '_draft', kind: 'arrow' as const, x: draftArrow.x1, y: draftArrow.y1, endX: draftArrow.x2, endY: draftArrow.y2 }]
        : []),
    ];

    return (
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${box.w} ${box.h}`} preserveAspectRatio="none">
        <defs>
          <marker id="editor-arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L12,6 L0,12 Z" fill="#ef4444" />
          </marker>
        </defs>
        {localAnn
          .filter((a) => a.kind === 'circle')
          .map((a) => {
            const selected = selection?.kind === 'annotation' && selection.id === a.id;
            const r = pctToPx((a.size ?? 8) / 2, Math.min(box.w, box.h));
            return (
              <circle
                key={a.id}
                cx={pctToPx(a.x, box.w)}
                cy={pctToPx(a.y, box.h)}
                r={r}
                fill="rgba(239,68,68,0.12)"
                stroke="#ef4444"
                strokeWidth={selected ? stroke + 1 : stroke}
              />
            );
          })}
        {draftCircle && draftCircle.r > 0 && (
          <circle
            cx={pctToPx(draftCircle.cx, box.w)}
            cy={pctToPx(draftCircle.cy, box.h)}
            r={pctToPx(draftCircle.r / 2, Math.min(box.w, box.h))}
            fill="rgba(239,68,68,0.08)"
            stroke="#f87171"
            strokeWidth={stroke}
            strokeDasharray="6 4"
          />
        )}
        {lines.map((a) => {
          if (a.endX == null || a.endY == null) return null;
          const selected = selection?.kind === 'annotation' && selection.id === a.id;
          return (
            <line
              key={a.id}
              x1={pctToPx(a.x, box.w)}
              y1={pctToPx(a.y, box.h)}
              x2={pctToPx(a.endX, box.w)}
              y2={pctToPx(a.endY, box.h)}
              stroke="#ef4444"
              strokeWidth={selected ? stroke + 1 : stroke}
              strokeLinecap="round"
              strokeDasharray={a.id === '_draft' ? '8 5' : undefined}
              markerEnd="url(#editor-arrowhead)"
            />
          );
        })}
      </svg>
    );
  };

  const renderText = (a: StepAnnotation) => {
    const selected = selection?.kind === 'annotation' && selection.id === a.id;
    const s = textStyleOf(a);
    const px = textDisplayPx(s.fontSize, box.w);
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
          className={`inline-block max-w-full cursor-move rounded px-2 py-1 shadow transition-shadow ${
            selected ? 'ring-2 ring-primary-400' : ''
          }`}
          style={{
            fontSize: px,
            fontFamily: fontFamilyCss(s.fontFamily),
            fontWeight: s.fontWeight,
            color: s.textColor,
            backgroundColor: s.bgColor,
            lineHeight: 1.25,
          }}
        >
          {a.text}
        </div>
        {selected && (
          <div
            data-handle
            className="absolute bottom-0 right-0 z-20 h-5 w-5 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full bg-primary-500 shadow ring-2 ring-white"
            onPointerDown={(e) => startDrag('resize-text', e, { kind: 'annotation', id: a.id })}
          />
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

  const renderSelectionHandles = () => {
    if (!selection || selection.kind !== 'annotation' || pendingText) return null;
    const a = localAnn.find((x) => x.id === selection.id);
    if (!a || a.kind === 'text') return null;

    if (a.kind === 'circle') {
      const handleX = a.x + (a.size ?? 8) / 4;
      return (
        <div
          data-handle
          className="absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-se-resize rounded-full bg-primary-500 shadow ring-2 ring-white"
          style={{ left: `${handleX}%`, top: `${a.y}%` }}
          onPointerDown={(e) => startDrag('resize-circle', e, selection)}
        />
      );
    }

    if (a.kind === 'arrow' && a.endX != null && a.endY != null) {
      return (
        <>
          <div
            data-handle
            className="absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full bg-white shadow ring-2 ring-primary-500"
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
            onPointerDown={(e) => startDrag('resize-arrow-start', e, selection)}
          />
          <div
            data-handle
            className="absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full bg-primary-500 shadow ring-2 ring-white"
            style={{ left: `${a.endX}%`, top: `${a.endY}%` }}
            onPointerDown={(e) => startDrag('resize-arrow-end', e, selection)}
          />
        </>
      );
    }
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const blob = await compositeScreenshot(screenshotUrl, localMasks, localAnn);
      const file = new File([blob], 'edited.webp', { type: blob.type || 'image/webp' });
      const newUrl = await uploadStepScreenshot(manualId, stepId, file);
      onSave({ masks: [], annotations: [], screenshotUrl: newUrl });
      onClose();
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
    { id: 'circle', label: '丸囲み', icon: <Circle size={14} /> },
    { id: 'arrow', label: '矢印', icon: <ArrowRight size={14} /> },
    { id: 'text', label: 'テキスト', icon: <Type size={14} /> },
  ];

  const draftEditorPx = textDisplayPx(textDraftStyle.fontSize, box.w);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Maximize2 size={18} className="text-primary-400" />
          <span className="font-bold">画面編集</span>
          <span className="hidden text-xs text-slate-400 lg:inline">
            ドラッグで描画 · 選択して移動 · テキストはフォント・サイズ変更可
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={history.length <= 1}
            onClick={undo}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40"
          >
            <Undo2 size={14} />
            戻す
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
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

      {(selectedTextAnn || pendingText) && (
        <div
          data-inspector
          className="flex flex-wrap items-center gap-3 border-b border-slate-700 bg-slate-900/80 px-4 py-2 text-white"
        >
          <span className="text-xs font-semibold text-slate-400">テキスト</span>
          <label className="flex items-center gap-2 text-xs">
            フォント
            <select
              value={pendingText ? textDraftStyle.fontFamily : selectedTextAnn?.fontFamily ?? 'noto'}
              onChange={(e) => {
                const fontFamily = e.target.value as AnnotationFontFamily;
                if (pendingText) setTextDraftStyle((s) => ({ ...s, fontFamily }));
                else updateSelectedTextStyle({ fontFamily });
              }}
              className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[160px] flex-1 items-center gap-2 text-xs sm:max-w-xs">
            サイズ
            <input
              type="range"
              min={12}
              max={56}
              value={pendingText ? textDraftStyle.fontSize : selectedTextAnn?.fontSize ?? DEFAULT_TEXT_STYLE.fontSize}
              onChange={(e) => {
                const fontSize = Number(e.target.value);
                if (pendingText) setTextDraftStyle((s) => ({ ...s, fontSize }));
                else updateSelectedTextStyle({ fontSize });
              }}
              className="flex-1 accent-primary-500"
            />
            <span className="w-8 tabular-nums">
              {pendingText ? textDraftStyle.fontSize : selectedTextAnn?.fontSize ?? DEFAULT_TEXT_STYLE.fontSize}
            </span>
          </label>
          <button
            type="button"
            onClick={() => {
              const next = (
                (pendingText ? textDraftStyle.fontWeight : selectedTextAnn?.fontWeight) === 'bold' ? 'normal' : 'bold'
              ) as 'normal' | 'bold';
              if (pendingText) setTextDraftStyle((s) => ({ ...s, fontWeight: next }));
              else updateSelectedTextStyle({ fontWeight: next });
            }}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
              (pendingText ? textDraftStyle.fontWeight : selectedTextAnn?.fontWeight) === 'bold'
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
              文言を編集
            </button>
          )}
        </div>
      )}

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <div className="relative max-h-full max-w-[min(100%,1400px)]">
          <img src={screenshotUrl} alt="" className="block max-h-[calc(100vh-180px)] w-auto max-w-full select-none" draggable={false} />
          <div
            ref={overlayRef}
            className={`absolute inset-0 touch-none select-none ${tool === 'select' && !isDragging ? 'cursor-default' : 'cursor-crosshair'}`}
            style={{ touchAction: 'none' }}
            onPointerDown={onOverlayPointerDown}
          >
            {localMasks.map(renderMask)}
            {renderSvgAnnotations()}
            {localAnn.filter((a) => a.kind === 'text' && a.id !== pendingText?.id).map(renderText)}
            {renderSelectionHandles()}
            {current && current.w > 0 && current.h > 0 && (
              <div
                className="pointer-events-none absolute border-2 border-primary-400 bg-primary-400/20"
                style={{ left: current.x, top: current.y, width: current.w, height: current.h }}
              />
            )}
            {pendingText && (
              <div
                data-text-input
                className="absolute z-30 min-w-[160px] max-w-[min(90%,420px)]"
                style={{
                  left: `${pendingText.x}%`,
                  top: `${pendingText.y}%`,
                  transform: 'translate(-4px,-4px)',
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <textarea
                  ref={textEditRef}
                  value={textDraft}
                  rows={2}
                  placeholder="テキストを入力"
                  onChange={(e) => setTextDraft(e.target.value)}
                  onCompositionStart={() => {
                    composingRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    composingRef.current = false;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      commitText();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setPendingText(null);
                      setTextDraft('');
                    }
                    e.stopPropagation();
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      if (!composingRef.current) commitText();
                    }, 0);
                  }}
                  className="w-full resize-none rounded px-2 py-1 shadow-lg outline-none ring-2 ring-primary-400"
                  style={{
                    fontSize: draftEditorPx,
                    fontFamily: fontFamilyCss(textDraftStyle.fontFamily),
                    fontWeight: textDraftStyle.fontWeight,
                    color: textDraftStyle.textColor,
                    backgroundColor: textDraftStyle.bgColor,
                    lineHeight: 1.25,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
