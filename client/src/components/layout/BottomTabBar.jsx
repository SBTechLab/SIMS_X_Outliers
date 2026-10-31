import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn.js';

/**
 * Four tabs at the bottom of a FieldLayout screen. 64px tall, respects the iOS safe area.
 */
export function BottomTabBar({ items }) {
  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface shadow-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex h-field-bar max-w-md">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to.split('/').length <= 3}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-micro',
                  'focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2',
                  isActive ? 'text-sun' : 'text-muted',
                )
              }
            >
              <item.icon size={22} aria-hidden="true" fill={undefined} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
