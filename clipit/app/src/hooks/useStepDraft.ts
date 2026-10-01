import { useEffect, useRef, useState } from 'react';

type DraftFields = { title: string; instruction: string; note: string };

/** 説明文など — キー入力ごとの Firestore 保存で文字が欠けるのを防ぐ（デバウンス自動保存） */
export function useStepDraft(
  stepId: string | undefined,
  source: DraftFields | undefined,
  onSave: (fields: DraftFields) => Promise<void>,
  delayMs = 600,
  onSaved?: () => void,
) {
  const [draft, setDraft] = useState<DraftFields>({ title: '', instruction: '', note: '' });
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSaved = useRef<DraftFields>({ title: '', instruction: '', note: '' });

  useEffect(() => {
    if (!stepId || !source) return;
    const next = { title: source.title, instruction: source.instruction, note: source.note ?? '' };
    setDraft(next);
    lastSaved.current = next;
    setSaveState('idle');
    if (timer.current) clearTimeout(timer.current);
  }, [stepId]);

  const scheduleSave = (next: DraftFields) => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState('pending');
    timer.current = setTimeout(() => {
      void (async () => {
        setSaveState('saving');
        try {
          await onSave(next);
          lastSaved.current = next;
          setSaveState('saved');
          onSaved?.();
        } catch {
          setSaveState('idle');
        }
      })();
    }, delayMs);
  };

  const update = (patch: Partial<DraftFields>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      scheduleSave(next);
      return next;
    });
  };

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState('saving');
    await onSave(draft);
    lastSaved.current = draft;
    setSaveState('saved');
    onSaved?.();
  };

  return { draft, update, flush, saveState };
}
