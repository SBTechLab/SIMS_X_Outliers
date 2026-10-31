import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { BrandMark } from './BrandMark.jsx';
import { IconButton } from '@/components/ui/IconButton.jsx';

const KEY = 'sunpower.sidebar.collapsed';

/**
 * The left-hand nav on AppLayout.
 *
 * `groups` is one of the arrays in config/navigation. Items can be in a group or at the top
 * level; both arrangements are tolerated so simple roles do not need group headings.
 */
export function Sidebar({ groups }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? '1' : '0');
    } catch {
      /* localStorage may be blocked in private mode — the collapse just does not persist. */
    }
  }, [collapsed]);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-ink-soft bg-ink text-white transition-[width] duration-200 lg:flex',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
      )}
    >
      <div className="flex h-topbar items-center justify-between gap-2 border-b border-ink-soft px-4">
        {collapsed ? (
          <BrandMark color="light" compact />
        ) : (
          <BrandMark color="light" />
        )}
        <IconButton
          icon={collapsed ? ChevronRight : ChevronLeft}
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          size="sm"
          onClick={() => setCollapsed((v) => !v)}
          className="text-white/80 hover:bg-ink-soft hover:text-white"
        />
      </div>

      <nav aria-label="Sidebar" className="flex-1 overflow-y-auto px-2 py-4">
        {groups.map((group, i) => (
          <SidebarGroup key={group.group ?? i} group={group} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
}

function SidebarGroup({ group, collapsed }) {
  const items = group.items ?? [group];
  return (
    <div className="mb-5 last:mb-0">
      {group.group && !collapsed && (
        <p className="mb-1 px-3 text-micro uppercase tracking-wider text-white/50">
          {group.group}
        </p>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to.split('/').length <= 2}
              className={({ isActive }) =>
                cn(
                  'relative flex h-10 items-center gap-3 rounded-input px-3 text-body transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
                  isActive
                    ? 'bg-ink-soft text-white before:absolute before:left-0 before:top-1.5 before:h-7 before:w-[3px] before:rounded-r before:bg-sun'
                    : 'text-white/80 hover:bg-ink-soft hover:text-white',
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
