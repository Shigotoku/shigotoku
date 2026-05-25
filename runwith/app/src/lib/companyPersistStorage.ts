import { deleteDoc, doc } from 'firebase/firestore';
import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { useCompanyStore } from '../store/company';
import { useAuthStore } from '../store/auth';
import { getStorageJson, saveStorageItem } from './companyStorage';
import { db, isFirebaseConfigured } from './firebase';
import { COL } from './firestore';

function dataRef(companyId: string, key: string) {
  return doc(db, COL.companies, companyId, 'data', key);
}

function getContext() {
  return {
    companyId: useCompanyStore.getState().company?.id,
    isDemo: useAuthStore.getState().isDemo,
  };
}

/** Zustand persist 用の会社スコープ非同期ストレージ */
export function createCompanyPersistStorage<S>(): PersistStorage<S> {
  return {
    getItem: async (name): Promise<StorageValue<S> | null> => {
      const { companyId, isDemo } = getContext();
      if (isDemo || !companyId || !isFirebaseConfigured) {
        const str = localStorage.getItem(name);
        if (!str) return null;
        try {
          return JSON.parse(str) as StorageValue<S>;
        } catch {
          return null;
        }
      }
      return getStorageJson<StorageValue<S>>(name, companyId, isDemo);
    },

    setItem: async (name, value): Promise<void> => {
      const { companyId, isDemo } = getContext();
      await saveStorageItem(name, companyId, isDemo, value);
    },

    removeItem: async (name): Promise<void> => {
      const { companyId, isDemo } = getContext();
      if (isDemo || !companyId || !isFirebaseConfigured) {
        localStorage.removeItem(name);
        return;
      }
      await deleteDoc(dataRef(companyId, name));
    },
  };
}
