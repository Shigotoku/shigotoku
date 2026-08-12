import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../components/AuthProvider';
import { ensureUserBootstrapped, getOrganization } from '../services/bootstrap';
import type { ClipitOrganization, ClipitUserProfile } from '../types';

interface OrgState {
  profile: ClipitUserProfile | null;
  organization: ClipitOrganization | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgState>({
  profile: null,
  organization: null,
  loading: true,
  error: '',
  refresh: async () => {},
});

export function useOrg() {
  return useContext(OrgContext);
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, demoMode } = useAuth();
  const [profile, setProfile] = useState<ClipitUserProfile | null>(null);
  const [organization, setOrganization] = useState<ClipitOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (demoMode || !user) return;
    setError('');
    try {
      const p = await ensureUserBootstrapped(user);
      setProfile(p);
      const org = await getOrganization(p.organizationId);
      setOrganization(org);
    } catch (e) {
      setError((e as Error).message ?? '組織情報の読み込みに失敗しました');
    }
  }, [user, demoMode]);

  useEffect(() => {
    if (authLoading) return;
    if (demoMode) {
      setProfile({
        uid: 'demo',
        organizationId: 'demo-org',
        name: 'デモユーザー',
        email: 'demo@clipit.local',
        role: 'owner',
      });
      setOrganization({
        id: 'demo-org',
        name: 'デモクリニック',
        type: 'clinic',
        plan: 'standard',
        onboardingCompleted: true,
      });
      setLoading(false);
      return;
    }
    if (!user) {
      setProfile(null);
      setOrganization(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [user, authLoading, demoMode, refresh]);

  return (
    <OrgContext.Provider value={{ profile, organization, loading: authLoading || loading, error, refresh }}>
      {children}
    </OrgContext.Provider>
  );
}
