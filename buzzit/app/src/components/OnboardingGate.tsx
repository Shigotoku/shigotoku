import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isOnboardingDone } from '../lib/onboarding';

/** 初回ウィザード未完了なら /onboarding へ */
export default function OnboardingGate() {
  const location = useLocation();
  const done = isOnboardingDone();

  if (!done && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (done && location.pathname === '/onboarding') {
    // 完了済みで直接 /onboarding に来た場合はダッシュボードへ
    // （見直しはクエリ ?edit=1 で許可）
    const params = new URLSearchParams(location.search);
    if (params.get('edit') !== '1') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}
