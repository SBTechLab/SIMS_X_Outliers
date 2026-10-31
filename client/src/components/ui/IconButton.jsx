import { forwardRef } from 'react';
import { cn } from '@/lib/cn.js';
import { Spinner } from './Spinner.jsx';

const SIZES = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };
const ICON = { sm: 14, md: 18, lg: 22 };

const VARIANTS = {
  ghost: 'text-ink hover:bg-ink-tint',
  outline: 'border border-line bg-surface text-ink hover:bg-ink-tint',
  danger: 'text-alert hover:bg-alert-soft',
};

/**
 * A square icon-only button. `label` is required and becomes the aria-label — an icon button
 * with no accessible name is unusable with a screen reader (DESIGN.md section 10).
 */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', loading = false, disabled, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-input transition-colors',
        'focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2',
        'active:scale-[0.98] motion-reduce:active:scale-100',
        SIZES[size],
        VARIANTS[variant],
        (disabled || loading) && 'cursor-not-allowed opacity-50 active:scale-100',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={ICON[size]} /> : <Icon size={ICON[size]} aria-hidden="true" />}
    </button>
  );
});

