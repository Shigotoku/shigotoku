import { useEffect, useRef, useState, type PointerEvent } from "react";

type Tool = "pen" | "rect" | "arrow" | "text";

type Props = {
  src: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
};

/** スクリーンショット注釈（CAP-006）— 完全クライアント側 */
export default function ScreenshotAnnotator({ src, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#E11D48");
  const drawing = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const snapshot = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const maxW = Math.min(720, img.width);
      const scale = maxW / img.width;
      canvas.width = maxW;
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = src;
  }, [src]);

  const pos = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    drawing.current = true;
    start.current = p;
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === "text") {
      const text = window.prompt("注釈テキスト");
      if (text) {
        ctx.fillStyle = color;
        ctx.font = "bold 18px IBM Plex Sans, sans-serif";
        ctx.fillText(text, p.x, p.y);
      }
      drawing.current = false;
      return;
    }
    if (tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
    }
  };

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !start.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const p = pos(e);

    if (tool === "pen") {
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      return;
    }

    if (snapshot.current) ctx.putImageData(snapshot.current, 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillStyle = color;

    if (tool === "rect") {
      ctx.strokeRect(start.current.x, start.current.y, p.x - start.current.x, p.y - start.current.y);
    } else if (tool === "arrow") {
      drawArrow(ctx, start.current.x, start.current.y, p.x, p.y);
    }
  };

  const onUp = () => {
    drawing.current = false;
    start.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 sm:items-center sm:p-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-h-[95dvh] w-full max-w-3xl overflow-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {([
            ["pen", "ペン"],
            ["rect", "矩形"],
            ["arrow", "矢印"],
            ["text", "文字"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-semibold ${
                tool === id ? "bg-ink text-paper" : "border border-ink/15"
              }`}
              onClick={() => setTool(id)}
            >
              {label}
            </button>
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="ml-auto h-10 w-12 cursor-pointer rounded border border-ink/10"
            title="色"
          />
        </div>
        <canvas
          ref={canvasRef}
          className="mt-3 max-w-full touch-none rounded-lg border border-ink/10"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="min-h-[44px] rounded-xl border border-ink/15 px-4 py-2 text-xs" onClick={onCancel}>
            キャンセル
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-xl bg-mint px-4 py-2 text-xs font-semibold text-white"
            onClick={() => {
              const url = canvasRef.current?.toDataURL("image/jpeg", 0.88);
              if (url) onSave(url);
            }}
          >
            注釈を保存
          </button>
        </div>
      </div>
    </div>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  const head = 12;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - head * Math.cos(angle - Math.PI / 6), toY - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - head * Math.cos(angle + Math.PI / 6), toY - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}
