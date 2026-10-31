import { cn } from '@/lib/cn.js';
import { enumBadge, enumLabel } from '@/lib/constants.js';

/**
 * One colour per enum value, from the mapping in lib/constants.js.
 *
 * No icon and no dot: the label carries the meaning, so status is never colour-only
 * (DESIGN.md section 10).
 */
export function StatusBadge({ enumName, value, className }) {
  if (!value) return <span className="text-small text-muted">—</span>;

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-input px-2 py-0.5 text-micro',
        enumBadge(enumName, value),
        className,
      )}
    >
      {enumLabel(enumName, value)}
    </span>
  );
}

