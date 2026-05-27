import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { fetchStores, setActiveStore as setActiveStoreApi, type StoreRecord } from '../lib/api';
import type { StoreRole } from '../lib/permissions';

interface StoreContextValue {
  stores: StoreRecord[];
  activeStoreId: string | null;
  userRole: StoreRole | null;
  loading: boolean;
  refreshStores: () => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
  setUserRole: (role: StoreRole | null) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<StoreRole | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStores();
      setStores(data.stores);
      setActiveStoreId(data.activeStoreId);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchStore = useCallback(async (storeId: string) => {
    await setActiveStoreApi(storeId);
    setActiveStoreId(storeId);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStoreId,
        userRole,
        loading,
        refreshStores,
        switchStore,
        setUserRole,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
