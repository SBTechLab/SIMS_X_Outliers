import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes, with later classes winning conflicts.
 *
 * Why: every UI kit component takes a className passthrough. Without tailwind-merge,
 *      `cn('px-4', 'px-6')` would emit both and the result would depend on stylesheet order.
 * Example:
 *   cn('h-10 px-4', isActive && 'bg-sun', className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
