import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  fetchPersonas,
  setActivePersona as setActivePersonaApi,
  type PersonaRecord,
  type PersonaRole,
} from '../lib/api';
import { isPersonaLocked } from '../lib/personaLock';

interface PersonaContextValue {
  personas: PersonaRecord[];
  activePersonaId: string | null;
  activePersona: PersonaRecord | null;
  userRole: PersonaRole | null;
  limits: {
    included: number;
    extraSlots: number;
    max: number;
    canAdd: boolean;
    label: string;
    devFullAccess?: boolean;
  } | null;
  loading: boolean;
  switching: boolean;
  refreshPersonas: () => Promise<void>;
  switchPersona: (personaId: string) => Promise<void>;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [personas, setPersonas] = useState<PersonaRecord[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<PersonaRole | null>(null);
  const [limits, setLimits] = useState<PersonaContextValue['limits']>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const refreshPersonas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPersonas();
      setPersonas(data.personas);
      setActivePersonaId(data.activePersonaId);
      setLimits(data.limits);
      if (data.role) setUserRole(data.role);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchPersona = useCallback(async (personaId: string) => {
    if (isPersonaLocked() && activePersonaId && personaId !== activePersonaId) {
      throw new Error('キャラ固定中です。画面上部の「キャラ固定中」を押して解除してから切り替えてください。');
    }
    setSwitching(true);
    try {
      const result = await setActivePersonaApi(personaId);
      setActivePersonaId(result.activePersonaId);

      const data = await fetchPersonas();
      setPersonas(data.personas);
      setActivePersonaId(data.activePersonaId);
      setLimits(data.limits);
      if (data.role) setUserRole(data.role);

      if (data.activePersonaId !== personaId) {
        throw new Error('配信キャラの切り替えを反映できませんでした。ページを再読み込みしてください。');
      }

      const persona = data.personas.find((p) => p.id === personaId);
      window.dispatchEvent(
        new CustomEvent('buzzit-persona-changed', {
          detail: { personaName: persona?.name ?? '配信キャラ' },
        }),
      );
    } finally {
      setSwitching(false);
    }
  }, [activePersonaId]);

  const activePersona = useMemo(() => {
    if (!personas.length) return null;
    if (activePersonaId) {
      const found = personas.find((p) => p.id === activePersonaId);
      if (found) return found;
    }
    return personas[0] ?? null;
  }, [personas, activePersonaId]);

  return (
    <PersonaContext.Provider
      value={{
        personas,
        activePersonaId,
        activePersona,
        userRole,
        limits,
        loading,
        switching,
        refreshPersonas,
        switchPersona,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider');
  return ctx;
}
