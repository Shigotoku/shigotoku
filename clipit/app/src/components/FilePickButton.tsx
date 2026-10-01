import { useRef } from 'react';
import { Upload } from 'lucide-react';

type Props = {
  label: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: FileList) => void | Promise<void>;
  className?: string;
};

export default function FilePickButton({
  label,
  accept,
  multiple = false,
  disabled = false,
  onFiles,
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={async (e) => {
          const files = e.target.files;
          if (files?.length) await onFiles(files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`inline-flex items-center gap-2 rounded-xl border border-primary-300 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-800 transition hover:bg-primary-100 disabled:opacity-50 ${className}`}
      >
        <Upload size={16} />
        {label}
      </button>
    </>
  );
}
