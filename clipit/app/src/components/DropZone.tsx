import { useCallback, useState } from "react";
import { ImageUp } from "lucide-react";

type Props = {
  onFiles: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  hint?: string;
};

export default function DropZone({
  onFiles,
  accept = "image/*",
  multiple = true,
  label = "画像をドロップ、またはクリックして選択",
  hint = "PNG / JPG / WebP · 複数枚OK",
}: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
    },
    [onFiles],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
        dragOver ? "border-primary-400 bg-primary-50" : "border-slate-300 bg-slate-50/50 hover:border-primary-300 hover:bg-primary-50/30"
      }`}
    >
      <ImageUp size={28} className="text-primary-500" />
      <p className="mt-2 text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </label>
  );
}
