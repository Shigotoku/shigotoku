import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/authContext';

export default function ProtectedRoute() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f4f0] text-neutral-500">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
