import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { hasFullAccess } from '../lib/internalAccess';
import { useAuth } from './authContext';
import type { PlanTier } from '../types';

interface AppContextValue {
  plan: PlanTier;
  setPlan: (plan: PlanTier) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanTier>('starter');
  const { user } = useAuth();

  useEffect(() => {
    if (user?.email && hasFullAccess(user.email)) {
      setPlan('enterprise');
    }
  }, [user?.email]);

  return <AppContext.Provider value={{ plan, setPlan }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
