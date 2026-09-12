import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  fetchPersonas,
  setActivePersona as setActivePersonaApi,
  type PersonaRecord,
  type PersonaRole,
} from '../lib/api';

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
    await setActivePersonaApi(personaId);
    setActivePersonaId(personaId);
    const data = await fetchPersonas();
    setPersonas(data.personas);
    if (data.role) setUserRole(data.role);
  }, []);

  const activePersona = personas.find((p) => p.id === activePersonaId) ?? personas[0] ?? null;

  return (
    <PersonaContext.Provider
      value={{
        personas,
        activePersonaId,
        activePersona,
        userRole,
        limits,
        loading,
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
