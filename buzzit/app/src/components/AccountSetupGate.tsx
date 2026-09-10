import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { fetchAccount } from '../lib/api';

/** アカウント種別（個人/法人）未設定なら /account-setup へ */
export default function AccountSetupGate() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchAccount()
      .then((r) => {
        if (!mounted) return;
        setSetupRequired(r.accountSetupRequired);
      })
      .catch(() => {
        if (mounted) setSetupRequired(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-50 text-sm text-neutral-500">
        アカウント情報を確認しています...
      </div>
    );
  }

  if (setupRequired && location.pathname !== '/account-setup') {
    return <Navigate to="/account-setup" replace />;
  }

  if (!setupRequired && location.pathname === '/account-setup') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
