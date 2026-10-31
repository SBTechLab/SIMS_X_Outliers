import { Link } from 'react-router-dom';
import { GlobalSearch } from '@/features/search/GlobalSearch.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { UserMenu } from './UserMenu.jsx';
import { BrandMark } from './BrandMark.jsx';
import { useAuth } from '@/app/providers.jsx';

/**
 * The desktop topbar. 64px, surface, bottom line border.
 */
export function Topbar({ compact }) {
  const { user } = useAuth();
  const canSearch = user?.role !== 'CUSTOMER';

  return (
    <header className="sticky top-0 z-30 flex h-topbar items-center justify-between gap-4 border-b border-line bg-surface px-4 md:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <Link to="/" aria-label="Home">
          <BrandMark compact={compact} />
        </Link>
      </div>

      <div className="hidden flex-1 lg:block">
        {canSearch && <GlobalSearch className="max-w-[420px]" />}
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
