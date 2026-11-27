'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  testId: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, title, testId, onClose, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        data-testid={testId}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <h2 id={`${testId}-title`} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="rounded px-2 py-1 text-[var(--muted)] hover:bg-[var(--soft)]"
            aria-label="閉じる"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto px-4 py-3">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-[var(--line)] px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
