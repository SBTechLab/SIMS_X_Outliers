/**
 * Where each role lands after signing in (docs/ARCHITECTURE.md section 5).
 *
 * These paths must match AppRoutes.jsx. If one changes, both files change together.
 */
export const ROLE_HOME = {
  SUPER_ADMIN: '/admin',
  DIRECTOR: '/director',
  SALES_EXECUTIVE: '/sales/leads',
  SURVEY_TECHNICIAN: '/field/surveys',
  CUSTOMER: '/portal',
  WAREHOUSE_MANAGER: '/warehouse',
  INSTALLATION_TECHNICIAN: '/field/jobs',
  SUPPORT_EXECUTIVE: '/support',
};

export function roleHome(role) {
  return ROLE_HOME[role] ?? '/';
}
