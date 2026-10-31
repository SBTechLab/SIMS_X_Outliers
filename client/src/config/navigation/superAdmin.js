import { LayoutDashboard, Users, Package2, Settings, History } from 'lucide-react';

/**
 * Super admin sidebar. Keeps the software honest — users, kits, settings, audit log.
 */
export const superAdminNav = [
  { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    group: 'Platform',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/kit-templates', label: 'Kit templates', icon: Package2 },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/admin/audit', label: 'Audit log', icon: History },
    ],
  },
  { group: 'Developer', items: [{ to: '/dev/ui', label: 'UI kit', icon: Package2 }] },
];
