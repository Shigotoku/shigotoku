import { useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useCompanyStore } from "../store/company";
import { useSubscriptionStore } from "../store/subscription";
import { hasFullAccess } from "../lib/admin";
import { isFirebaseConfigured } from "../lib/firebase";
import { prefetchNavRoutes } from "../lib/routePrefetch";
import { Loader2 } from "lucide-react";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, initialized, user, isAuthenticated, isDemo } = useAuthStore();
  const { fetchCompanies, company } = useCompanyStore();
  const { fetchSubscription, setUserEmail, setPlan, setMedicalAddon } = useSubscriptionStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated || !user || isDemo || !isFirebaseConfigured) return;

    fetchCompanies(user.id);
    prefetchNavRoutes();
  }, [isAuthenticated, user?.id, isDemo, fetchCompanies]);

  useEffect(() => {
    setUserEmail(user?.email ?? null);
    if (user?.email && hasFullAccess(user.email)) {
      setPlan("pro");
      setMedicalAddon(true);
    }
  }, [user?.email, setUserEmail, setPlan, setMedicalAddon]);

  useEffect(() => {
    if (!isAuthenticated || isDemo || !isFirebaseConfigured) return;
    fetchSubscription(company?.id ?? null);
  }, [isAuthenticated, isDemo, company?.id, fetchSubscription]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
          <p className="mt-3 text-sm text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
