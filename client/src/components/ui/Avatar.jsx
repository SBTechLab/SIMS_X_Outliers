import { cn } from '@/lib/cn.js';
import { initials } from '@/lib/format.js';

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-micro',
  lg: 'h-10 w-10 text-small',
};

/** Initials on amber-soft. No generated cartoon faces (DESIGN.md section 13). */
export function Avatar({ name, size = 'md', className }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-amber-soft font-semibold text-ink',
        SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

