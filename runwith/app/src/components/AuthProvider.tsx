import { useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useCompanyStore } from "../store/company";
import { useSubscriptionStore } from "../store/subscription";
import { isFirebaseConfigured } from "../lib/firebase";
import { prefetchNavRoutes } from "../lib/routePrefetch";
import { Loader2 } from "lucide-react";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, initialized, user, isAuthenticated, isDemo } = useAuthStore();
  const { fetchCompanies } = useCompanyStore();
  const { fetchSubscription } = useSubscriptionStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated || !user || isDemo || !isFirebaseConfigured) return;

    // 複数会社を取得 (1ユーザーが複数社に所属可能)
    fetchCompanies(user.id);

    // サブスクリプションはユーザー単位で取得
    fetchSubscription(user.id);

    prefetchNavRoutes();
  }, [isAuthenticated, user?.id, isDemo, fetchCompanies, fetchSubscription]);

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
