import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';

/**
 * Requires a session. While /auth/me is loading, shows a shell skeleton rather than
 * redirecting — otherwise a hard refresh on any deep link bounces a signed-in user to /login.
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <Skeleton variant="stats" rows={4} />
      </div>
    );
  }

  if (!user) {
    // `from` lets the login page return the user to the page they were trying to reach.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
