import { X } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { Button } from './Button.jsx';

/**
 * A horizontal row of filter controls above a table.
 *
 * `active` is the count of filters currently set, so the "Clear filters" link only shows
 * when something is actually filtered.
 */
export function FilterBar({ active = 0, onClear, className, children }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-3 md:p-4',
        className,
      )}
    >
      {children}
      {active > 0 && onClear && (
        <div className="ml-auto">
          <Button variant="link" leadingIcon={X} onClick={onClear}>
            Clear filters ({active})
          </Button>
        </div>
      )}
    </div>
  );
}

