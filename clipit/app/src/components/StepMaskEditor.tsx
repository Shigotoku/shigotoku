import { useState } from "react";
import type { MaskRect } from "../types";

interface Props {
  masks: MaskRect[];
  onChange: (masks: MaskRect[]) => void;
}

export default function StepMaskEditor({ masks, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging || !start) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const x = Math.min(start.x, endX);
    const y = Math.min(start.y, endY);
    const width = Math.abs(endX - start.x);
    const height = Math.abs(endY - start.y);
    if (width > 8 && height > 8) {
      onChange([
        ...masks,
        { id: crypto.randomUUID(), x, y, width, height, type: 'black' },
      ]);
    }
    setDragging(false);
    setStart(null);
  };

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-600">マスキング（ドラッグで黒塗り範囲）</p>
      <div
        role="presentation"
        className="relative mt-2 aspect-[4/3] cursor-crosshair rounded-xl border border-slate-300 bg-slate-100"
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        {masks.map((m) => (
          <div
            key={m.id}
            className="absolute bg-black/85"
            style={{ left: m.x, top: m.y, width: m.width, height: m.height }}
          />
        ))}
      </div>
      {masks.length > 0 && (
        <button
          type="button"
          className="mt-2 text-xs text-danger-600 hover:underline"
          onClick={() => onChange([])}
        >
          マスクをすべて削除
        </button>
      )}
    </div>
  );
}
