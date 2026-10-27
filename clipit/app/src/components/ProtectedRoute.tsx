import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, demoMode } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
      </div>
    );
  }

  // デモモード（Firebase 未設定）では閲覧を許可。本番は未ログインならログインへ。
  if (!demoMode && !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
