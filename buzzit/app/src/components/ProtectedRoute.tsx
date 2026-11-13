import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authContext';

export default function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-500">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    const back = `${location.pathname}${location.search}`;
    const target = back === '/' || back.startsWith('/login') ? '/login' : `/login?redirect=${encodeURIComponent(back)}`;
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
