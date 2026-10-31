import { Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers.jsx';
import { ForbiddenPage } from '@/features/auth/pages/ForbiddenPage.jsx';

/**
 * Requires a role on the allowed list.
 *
 * Renders the 403 screen rather than redirecting — the user needs to understand what happened
 * (DESIGN.md section 10). This is only cosmetic; the server enforces RBAC on every request
 * (SECURITY.md section 7).
 */
export function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <ForbiddenPage />;
  return <Outlet />;
}
