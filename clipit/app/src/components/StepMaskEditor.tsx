import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { MaskRect } from '../types';
import ScreenshotFrame from './ScreenshotFrame';

interface Props {
  screenshotUrl?: string;
  masks: MaskRect[];
  onChange: (masks: MaskRect[]) => void;
}

function isPercentMask(m: MaskRect): boolean {
  return m.x <= 100 && m.y <= 100 && m.width <= 100 && m.height <= 100;
}

function pxToPercent(
  x: number,
  y: number,
  w: number,
  h: number,
  boxW: number,
  boxH: number,
): Pick<MaskRect, 'x' | 'y' | 'width' | 'height'> {
  return {
    x: Math.round((x / boxW) * 1000) / 10,
    y: Math.round((y / boxH) * 1000) / 10,
    width: Math.round((w / boxW) * 1000) / 10,
    height: Math.round((h / boxH) * 1000) / 10,
  };
}

export default function StepMaskEditor({ screenshotUrl, masks, onChange }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const pointInOverlay = useCallback((clientX: number, clientY: number) => {
    const el = overlayRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    return { x, y, boxW: rect.width, boxH: rect.height };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-mask-delete]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointInOverlay(e.clientX, e.clientY);
    if (!p) return;
    setDrag({ x: p.x, y: p.y });
    setCurrent({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = pointInOverlay(e.clientX, e.clientY);
    if (!p) return;
    const x = Math.min(drag.x, p.x);
    const y = Math.min(drag.y, p.y);
    const w = Math.abs(p.x - drag.x);
    const h = Math.abs(p.y - drag.y);
    setCurrent({ x, y, w, h });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag || !current) {
      setDrag(null);
      setCurrent(null);
      return;
    }
    const p = pointInOverlay(e.clientX, e.clientY);
    if (p && current.w > 6 && current.h > 6) {
      const pct = pxToPercent(current.x, current.y, current.w, current.h, p.boxW, p.boxH);
      onChange([
        ...masks,
        { id: crypto.randomUUID(), ...pct, type: 'black' },
      ]);
    }
    setDrag(null);
    setCurrent(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const removeMask = (id: string) => {
    onChange(masks.filter((m) => m.id !== id));
  };

  const renderMask = (m: MaskRect) => {
    const style = isPercentMask(m)
      ? {
          left: `${m.x}%`,
          top: `${m.y}%`,
          width: `${m.width}%`,
          height: `${m.height}%`,
        }
      : {
          left: m.x,
          top: m.y,
          width: m.width,
          height: m.height,
        };

    return (
      <div
        key={m.id}
        className="group absolute bg-black/90"
        style={style}
      >
        <button
          type="button"
          data-mask-delete
          onClick={(ev) => {
            ev.stopPropagation();
            removeMask(m.id);
          }}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger-600 text-white opacity-0 shadow group-hover:opacity-100"
          aria-label="この黒塗りを削除"
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-600">マスキング（ドラッグで黒塗り）</p>
      <p className="mt-0.5 text-[11px] text-slate-400">黒塗りにマウスを乗せると × で1件削除できます</p>
      {!screenshotUrl ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          スクショがないためマスキングできません。記録するか「画像を差し替え・挿入」で画像を追加してください。
        </p>
      ) : (
        <div className="mt-2">
          <ScreenshotFrame
            screenshotUrl={screenshotUrl}
            overlay={
              <div
                ref={overlayRef}
                role="presentation"
                className="h-full w-full cursor-crosshair"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => {
                  setDrag(null);
                  setCurrent(null);
                }}
              >
                {masks.map(renderMask)}
                {current && current.w > 0 && current.h > 0 && (
                  <div
                    className="pointer-events-none absolute border-2 border-primary-400 bg-primary-400/25"
                    style={{
                      left: current.x,
                      top: current.y,
                      width: current.w,
                      height: current.h,
                    }}
                  />
                )}
              </div>
            }
          />
        </div>
      )}
      {masks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            className="text-xs text-danger-600 hover:underline"
            onClick={() => onChange([])}
          >
            黒塗りをすべて削除
          </button>
          <button
            type="button"
            className="text-xs text-slate-600 hover:underline"
            onClick={() => onChange(masks.slice(0, -1))}
          >
            直前の1件を取り消し
          </button>
        </div>
      )}
    </div>
  );
}
