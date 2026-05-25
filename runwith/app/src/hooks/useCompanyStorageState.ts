import { useCallback, useEffect, useRef, useState } from 'react';
import { useCompanyStore } from '../store/company';
import { useAuthStore } from '../store/auth';
import { loadStorageItem, saveStorageItem } from '../lib/companyStorage';

/**
 * 会社スコープの永続 state（Firestore / デモ時 localStorage）
 */
export function useCompanyStorageState<T>(key: string, initialValue: T) {
  const companyId = useCompanyStore((s) => s.company?.id);
  const isDemo = useAuthStore((s) => s.isDemo);
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    skipSave.current = true;
    setReady(false);

    (async () => {
      const loaded = await loadStorageItem(key, companyId, isDemo, initialValue);
      if (!cancelled) {
        setValue(loaded);
        setReady(true);
        skipSave.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, companyId, isDemo]);

  const persist = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (!skipSave.current) {
          void saveStorageItem(key, companyId, isDemo, resolved);
        }
        return resolved;
      });
    },
    [key, companyId, isDemo],
  );

  return [value, persist, ready] as const;
}
