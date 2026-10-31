import { cn } from '@/lib/cn.js';

/**
 * The loading spinner inside a button. Never used as a full-page loader — pages use
 * Skeleton, so the layout does not jump (DESIGN.md section 13).
 */
export function Spinner({ className, size = 16 }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

