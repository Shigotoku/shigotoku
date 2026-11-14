import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

const MIN = 20;
const MAX = 80;

function clamp(n: number) {
  return Math.min(MAX, Math.max(MIN, n));
}

/** 左右2カラムの幅(左の%)をドラッグ/キーで変更し、localStorage に記憶する */
export function useSplitPane(storageKey: string, defaultPct: number) {
  const [pct, setPct] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      return Number.isFinite(v) && v > 0 ? clamp(v) : defaultPct;
    } catch {
      return defaultPct;
    }
  });
  const ref = useRef<HTMLDivElement>(null);

  const save = useCallback(
    (v: number) => {
      try { localStorage.setItem(storageKey, String(Math.round(v))); } catch { /* noop */ }
    },
    [storageKey],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const grid = ref.current;
    if (!grid) return;
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const rect = grid.getBoundingClientRect();
    let latest = pct;
    const move = (ev: PointerEvent) => {
      latest = clamp(((ev.clientX - rect.left) / rect.width) * 100);
      setPct(latest);
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      save(latest);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = clamp(pct - 3);
    else if (e.key === 'ArrowRight') next = clamp(pct + 3);
    else if (e.key === 'Home') next = MIN;
    else if (e.key === 'End') next = MAX;
    if (next == null) return;
    e.preventDefault();
    setPct(next);
    save(next);
  };

  const reset = () => { setPct(defaultPct); save(defaultPct); };
  const set = (v: number) => { const c = clamp(v); setPct(c); save(c); };

  const gridStyle = {
    '--split-cols': `minmax(0,${pct}fr) 14px minmax(0,${100 - pct}fr)`,
  } as CSSProperties;

  return { pct, ref, gridStyle, handleProps: { onPointerDown, onKeyDown, onDoubleClick: reset }, set, reset };
}

/** グリッドの2カラムの間に置く縦のつまみ（lg 以上でのみ表示） */
export function SplitHandle({
  pct,
  handleProps,
}: {
  pct: number;
  handleProps: ReturnType<typeof useSplitPane>['handleProps'];
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="左右の幅を変更（ドラッグ、または左右キー）"
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      aria-valuenow={Math.round(pct)}
      tabIndex={0}
      title="ドラッグで幅を変更 / ダブルクリックで元に戻す"
      {...handleProps}
      className="group hidden cursor-col-resize touch-none items-center justify-center outline-none lg:flex"
    >
      <span className="h-full max-h-24 w-1 rounded-full bg-neutral-300 transition group-hover:bg-neutral-500 group-focus-visible:bg-neutral-700" />
    </div>
  );
}
