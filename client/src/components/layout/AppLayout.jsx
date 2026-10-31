import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/app/providers.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { superAdminNav } from '@/config/navigation/superAdmin.js';
import { directorNav } from '@/config/navigation/director.js';
import { salesNav } from '@/config/navigation/sales.js';
import { warehouseNav } from '@/config/navigation/warehouse.js';
import { supportNav } from '@/config/navigation/support.js';
import { fadeRise } from '@/lib/motion.js';

/** Picks the sidebar config by role. */
const NAV_BY_ROLE = {
  SUPER_ADMIN: superAdminNav,
  DIRECTOR: directorNav,
  SALES_EXECUTIVE: salesNav,
  WAREHOUSE_MANAGER: warehouseNav,
  SUPPORT_EXECUTIVE: supportNav,
};

/**
 * Desktop staff shell. Technicians and customers use FieldLayout instead.
 */
export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const groups = NAV_BY_ROLE[user.role] ?? [];

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar groups={groups} />

      <div className="flex min-w-0 flex-1 flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-input focus:bg-ink focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        <Topbar />

        <main id="main" className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-6">
          <div className="mx-auto max-w-[1400px]">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} {...fadeRise}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
