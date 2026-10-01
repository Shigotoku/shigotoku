import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, MoreVertical, Pencil, Share2 } from "lucide-react";

type Props = {
  manualId: string;
  compact?: boolean;
};

export default function ManualActionsMenu({ manualId, compact }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs"
        }`}
        aria-label="マニュアル操作メニュー"
      >
        <MoreVertical size={compact ? 14 : 16} />
        {!compact && "操作"}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <Link
            to={`/manuals/${manualId}/preview`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Eye size={14} />
            プレビュー
          </Link>
          <Link
            to={`/manuals/${manualId}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={14} />
            編集
          </Link>
          <Link
            to={`/manuals/${manualId}/share`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Share2 size={14} />
            共有
          </Link>
        </div>
      )}
    </div>
  );
}
