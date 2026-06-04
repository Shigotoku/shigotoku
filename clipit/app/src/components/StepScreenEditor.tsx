import { useCallback, useRef, useState } from 'react';
import { X, Maximize2, Circle, Type, Square, ArrowRight, Loader2 } from 'lucide-react';
import { compositeScreenshot } from '../lib/compositeScreenshot';
import { uploadStepScreenshot } from '../lib/uploadStepScreenshot';
import type { MaskRect, MaskStyle, StepAnnotation } from '../types';

type Tool = 'mask-black' | 'mask-mosaic' | 'mask-blur' | 'circle' | 'arrow' | 'text';

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

function maskStyleClass(type: MaskStyle): string {
  if (type === 'pixelate') {
    return 'bg-[length:10px_10px] bg-[image:repeating-conic-gradient(#6b7280_0%_25%,#9ca3af_0%_50%)] opacity-95';
  }
  if (type === 'blur') {
    return 'bg-slate-400/60 backdrop-blur-md';
  }
  return 'bg-black/90';
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
  const [localMasks, setLocalMasks] = useState(masks);
  const [localAnn, setLocalAnn] = useState(annotations);
  const [tool, setTool] = useState<Tool>('mask-black');
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [draftCircle, setDraftCircle] = useState<{ cx: number; cy: number; r: number } | null>(null);
  const [draftArrow, setDraftArrow] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pointInOverlay = useCallback((clientX: number, clientY: number) => {
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

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-del],[data-handle]')) return;
    const p = pointInOverlay(e.clientX, e.clientY);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedId(null);

    if (tool === 'circle') {
      setDraftCircle({ cx: p.pctX, cy: p.pctY, r: 0 });
      setDrag({ x: p.x, y: p.y });
      return;
    }
    if (tool === 'arrow') {
      setDraftArrow({ x1: p.pctX, y1: p.pctY, x2: p.pctX, y2: p.pctY });
      setDrag({ x: p.x, y: p.y });
      return;
    }
    if (tool === 'text') {
      const text = window.prompt('注釈テキスト', 'ここを確認') ?? '';
      if (text.trim()) {
        setLocalAnn((a) => [
          ...a,
          { id: crypto.randomUUID(), kind: 'text', x: p.pctX, y: p.pctY, text: text.trim() },
        ]);
      }
      return;
    }

    setDrag({ x: p.x, y: p.y });
    setCurrent({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointInOverlay(e.clientX, e.clientY);
    if (!p) return;

    if (draftCircle && drag) {
      const dx = p.x - drag.x;
      const dy = p.y - drag.y;
      const rPx = Math.sqrt(dx * dx + dy * dy);
      const rPct = (rPx / Math.min(p.boxW, p.boxH)) * 100 * 2;
      setDraftCircle((c) => (c ? { ...c, r: rPct } : null));
      return;
    }
    if (draftArrow && drag) {
      setDraftArrow((a) => (a ? { ...a, x2: p.pctX, y2: p.pctY } : null));
      return;
    }
    if (!drag) return;
    const x = Math.min(drag.x, p.x);
    const y = Math.min(drag.y, p.y);
    setCurrent({ x, y, w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = pointInOverlay(e.clientX, e.clientY);

    if (draftCircle && draftCircle.r > 1) {
      setLocalAnn((a) => [
        ...a,
        { id: crypto.randomUUID(), kind: 'circle', x: draftCircle.cx, y: draftCircle.cy, size: draftCircle.r },
      ]);
    }
    if (draftArrow && p) {
      const dx = Math.abs(draftArrow.x2 - draftArrow.x1);
      const dy = Math.abs(draftArrow.y2 - draftArrow.y1);
      if (dx > 0.5 || dy > 0.5) {
        setLocalAnn((a) => [
          ...a,
          {
            id: crypto.randomUUID(),
            kind: 'arrow',
            x: draftArrow.x1,
            y: draftArrow.y1,
            endX: draftArrow.x2,
            endY: draftArrow.y2,
          },
        ]);
      }
    }

    if (drag && current && p && current.w > 6 && current.h > 6 && !draftCircle && !draftArrow) {
      const pct = pxToPercent(current.x, current.y, current.w, current.h, p.boxW, p.boxH);
      setLocalMasks((m) => [
        ...m,
        { id: crypto.randomUUID(), ...pct, type: maskTypeFromTool() },
      ]);
    }

    setDrag(null);
    setCurrent(null);
    setDraftCircle(null);
    setDraftArrow(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const resizeCircle = (id: string, clientX: number, clientY: number) => {
    const p = pointInOverlay(clientX, clientY);
    if (!p) return;
    const ann = localAnn.find((a) => a.id === id);
    if (!ann || ann.kind !== 'circle') return;
    const cx = (ann.x / 100) * p.boxW;
    const cy = (ann.y / 100) * p.boxH;
    const rPx = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
    const size = (rPx / Math.min(p.boxW, p.boxH)) * 100 * 2;
    setLocalAnn((list) => list.map((a) => (a.id === id ? { ...a, size: Math.max(2, size) } : a)));
  };

  const renderMask = (m: MaskRect) => {
    const style = isPercentMask(m)
      ? { left: `${m.x}%`, top: `${m.y}%`, width: `${m.width}%`, height: `${m.height}%` }
      : { left: m.x, top: m.y, width: m.width, height: m.height };

    return (
      <div key={m.id} className={`group absolute ${maskStyleClass(m.type)}`} style={style}>
        <button
          type="button"
          data-del
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger-600 text-white opacity-0 group-hover:opacity-100"
          onClick={() => setLocalMasks((list) => list.filter((x) => x.id !== m.id))}
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  const renderArrow = (a: StepAnnotation, dashed = false) => {
    if (a.endX == null || a.endY == null) return null;
    const x1 = a.x;
    const y1 = a.y;
    const x2 = a.endX;
    const y2 = a.endY;
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return (
      <div
        key={a.id}
        className="group absolute h-0 w-0"
        style={{ left: `${x1}%`, top: `${y1}%` }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(a.id);
        }}
      >
        <div
          className={`absolute origin-left border-t-4 border-red-500 ${dashed ? 'opacity-70' : ''}`}
          style={{
            width: `${len}%`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: '0 0',
          }}
        />
        <div
          className="absolute h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-red-500"
          style={{
            left: `${len}%`,
            top: '-5px',
            transform: `rotate(${angle}deg)`,
            transformOrigin: '0 0',
          }}
        />
        {!dashed && (
          <button
            type="button"
            data-del
            className="absolute left-full top-0 ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger-600 text-white opacity-0 group-hover:opacity-100"
            onClick={() => setLocalAnn((list) => list.filter((x) => x.id !== a.id))}
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  };

  const renderAnn = (a: StepAnnotation) => {
    if (a.kind === 'arrow') return renderArrow(a);
    if (a.kind === 'circle') {
      const size = a.size ?? 8;
      const selected = selectedId === a.id;
      return (
        <div
          key={a.id}
          className={`group absolute rounded-full border-4 border-red-500 bg-red-500/10 ${selected ? 'ring-2 ring-primary-400' : ''}`}
          style={{
            left: `${a.x}%`,
            top: `${a.y}%`,
            width: `${size}%`,
            aspectRatio: '1',
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedId(a.id);
          }}
        >
          {selected && (
            <div
              data-handle
              className="absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-full bg-primary-500 ring-2 ring-white"
              onPointerDown={(ev) => {
                ev.stopPropagation();
                const move = (me: PointerEvent) => resizeCircle(a.id, me.clientX, me.clientY);
                const up = () => {
                  window.removeEventListener('pointermove', move);
                  window.removeEventListener('pointerup', up);
                };
                window.addEventListener('pointermove', move);
                window.addEventListener('pointerup', up);
              }}
            />
          )}
          <button
            type="button"
            data-del
            className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-danger-600 text-white opacity-0 group-hover:opacity-100"
            onClick={() => setLocalAnn((list) => list.filter((x) => x.id !== a.id))}
          >
            <X size={12} />
          </button>
        </div>
      );
    }
    return (
      <div
        key={a.id}
        className="group absolute max-w-[50%] rounded bg-amber-400/95 px-2 py-1 text-xs font-bold text-amber-950 shadow"
        style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-4px,-4px)' }}
      >
        {a.text}
        <button
          type="button"
          data-del
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-danger-600 text-white"
          onClick={() => setLocalAnn((list) => list.filter((x) => x.id !== a.id))}
        >
          <X size={10} />
        </button>
      </div>
    );
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
    { id: 'mask-black', label: '黒塗り', icon: <Square size={14} /> },
    { id: 'mask-mosaic', label: 'モザイク', icon: <Square size={14} className="opacity-60" /> },
    { id: 'mask-blur', label: 'ぼかし', icon: <Square size={14} className="blur-[1px]" /> },
    { id: 'circle', label: '丸囲み', icon: <Circle size={14} /> },
    { id: 'arrow', label: '矢印', icon: <ArrowRight size={14} /> },
    { id: 'text', label: 'テキスト', icon: <Type size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Maximize2 size={18} className="text-primary-400" />
          <span className="font-bold">画面編集</span>
          <span className="text-xs text-slate-400">マスク・丸・矢印はドラッグ · テキストはクリック</span>
        </div>
        <div className="flex gap-2">
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

      <div className="flex flex-wrap gap-2 border-b border-slate-700 px-4 py-2">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
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
            setLocalMasks([]);
            setLocalAnn([]);
          }}
        >
          すべてクリア
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <div className="relative max-h-full max-w-[min(100%,1400px)]">
          <img src={screenshotUrl} alt="" className="block max-h-[calc(100vh-140px)] w-auto max-w-full" draggable={false} />
          <div
            ref={overlayRef}
            className="absolute inset-0 cursor-crosshair"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              setDrag(null);
              setCurrent(null);
              setDraftCircle(null);
              setDraftArrow(null);
            }}
          >
            {localMasks.map(renderMask)}
            {localAnn.map(renderAnn)}
            {draftCircle && draftCircle.r > 0 && (
              <div
                className="pointer-events-none absolute rounded-full border-4 border-dashed border-red-400 bg-red-500/10"
                style={{
                  left: `${draftCircle.cx}%`,
                  top: `${draftCircle.cy}%`,
                  width: `${draftCircle.r}%`,
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}
            {draftArrow &&
              renderArrow(
                {
                  id: '_draft',
                  kind: 'arrow',
                  x: draftArrow.x1,
                  y: draftArrow.y1,
                  endX: draftArrow.x2,
                  endY: draftArrow.y2,
                },
                true,
              )}
            {current && current.w > 0 && current.h > 0 && (
              <div
                className="pointer-events-none absolute border-2 border-primary-400 bg-primary-400/20"
                style={{ left: current.x, top: current.y, width: current.w, height: current.h }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
