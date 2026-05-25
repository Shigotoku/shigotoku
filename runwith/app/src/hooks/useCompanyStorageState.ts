import { useCallback, useEffect, useRef, useState } from 'react';
import { useCompanyStore } from '../store/company';
import { useAuthStore } from '../store/auth';
import { loadStorageItem, peekStorageItem, saveStorageItem } from '../lib/companyStorage';
import { isFirebaseConfigured } from '../lib/firebase';

/**
 * 会社スコープの永続 state（Firestore / デモ時 localStorage）
 */
export function useCompanyStorageState<T>(key: string, initialValue: T) {
  const companyId = useCompanyStore((s) => s.company?.id);
  const isDemo = useAuthStore((s) => s.isDemo);

  const [value, setValue] = useState<T>(() => {
    if (isDemo || !companyId || !isFirebaseConfigured) {
      return peekStorageItem<T>(key, companyId, isDemo) ?? initialValue;
    }
    return peekStorageItem<T>(key, companyId, isDemo) ?? initialValue;
  });

  const [ready, setReady] = useState(() => {
    if (isDemo || !companyId || !isFirebaseConfigured) return true;
    return peekStorageItem<T>(key, companyId, isDemo) !== undefined;
  });

  const skipSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    skipSave.current = true;

    const cached = peekStorageItem<T>(key, companyId, isDemo);
    if (cached !== undefined) {
      setValue(cached);
      setReady(true);
      skipSave.current = false;
      return;
    }

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
  }, [key, companyId, isDemo, initialValue]);

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
