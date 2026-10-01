import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'clipit-edit-column-widths';
const MIN_STEPS = 160;
const MIN_EDIT = 280;
const MIN_CENTER = 280;
const DEFAULT = { steps: 220, edit: 380 };

function load(): { steps: number; edit: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { steps?: number; edit?: number };
      if (typeof p.steps === 'number' && typeof p.edit === 'number') return { steps: p.steps, edit: p.edit };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT };
}

export function useEditLayoutColumns() {
  const [widths, setWidths] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  }, [widths]);

  const dragSteps = useCallback((delta: number, containerWidth: number) => {
    setWidths((w) => {
      const next = Math.max(MIN_STEPS, Math.min(w.steps + delta, containerWidth - MIN_CENTER - MIN_EDIT - 24));
      return { ...w, steps: next };
    });
  }, []);

  const dragEdit = useCallback((delta: number, containerWidth: number) => {
    setWidths((w) => {
      const next = Math.max(MIN_EDIT, Math.min(w.edit - delta, containerWidth - MIN_CENTER - MIN_STEPS - 24));
      return { ...w, edit: next };
    });
  }, []);

  return { widths, dragSteps, dragEdit };
}

export function ResizeGutter({ onDrag }: { onDrag: (deltaX: number) => void }) {
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    let lastX = e.clientX;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      onDrag(dx);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      className="hidden w-1.5 shrink-0 cursor-col-resize bg-slate-200 hover:bg-primary-300 lg:block"
      title="ドラッグで幅を調整"
    />
  );
}
