import { ArrowLeft } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/app/providers.jsx';
import { surveyNav } from '@/config/navigation/survey.js';
import { installationNav } from '@/config/navigation/installation.js';
import { customerNav } from '@/config/navigation/customer.js';
import { BottomTabBar } from './BottomTabBar.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { IconButton } from '@/components/ui/IconButton.jsx';
import { BrandMark } from './BrandMark.jsx';
import { fadeRise } from '@/lib/motion.js';

/**
 * Phone-first shell for technicians and customers. 56px ink top bar, 64px bottom tabs, and
 * the content gets 88px of bottom padding so a sticky primary button never covers the tabs.
 */
const NAV_BY_ROLE = {
  SURVEY_TECHNICIAN: surveyNav,
  INSTALLATION_TECHNICIAN: installationNav,
  CUSTOMER: customerNav,
};

/** Top-level field paths that show the brand mark instead of a back arrow. */
const ROOTS = new Set([
  '/field/surveys',
  '/field/jobs',
  '/field/tickets',
  '/field/profile',
  '/portal',
  '/portal/projects',
  '/portal/quotes',
  '/portal/invoices',
  '/portal/systems',
  '/portal/tickets',
  '/portal/profile',
]);

export function FieldLayout({ title }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = NAV_BY_ROLE[user.role] ?? [];
  const atRoot = ROOTS.has(location.pathname);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-ink px-3 text-white">
        {atRoot ? (
          <BrandMark color="light" compact />
        ) : (
          <IconButton
            icon={ArrowLeft}
            label="Back"
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-ink-soft"
          />
        )}
        <h1 className="truncate text-body font-semibold">{title ?? 'SunPower Solutions'}</h1>
        <NotificationBell />
      </header>

      <main id="main" className="flex-1 px-4 pb-24 pt-4">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} {...fadeRise}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomTabBar items={items} />
    </div>
  );
}
