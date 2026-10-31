import { forwardRef } from 'react';
import { cn } from '@/lib/cn.js';
import { Spinner } from './Spinner.jsx';

/** DESIGN.md section 5. sun carries ink text, never white — 7.9:1 against 4.5:1 required. */
const VARIANTS = {
  primary: 'bg-sun text-ink font-semibold hover:bg-sun-deep',
  secondary: 'bg-ink text-white font-medium hover:bg-ink-soft',
  outline: 'bg-surface text-ink font-medium border border-line hover:bg-ink-tint',
  ghost: 'bg-transparent text-ink font-medium hover:bg-ink-tint',
  danger: 'bg-alert text-white font-medium hover:brightness-90',
  link: 'bg-transparent text-sky underline-offset-2 hover:underline p-0 h-auto',
};

const SIZES = {
  sm: 'h-8 px-3 text-small gap-1.5',
  md: 'h-10 px-4 text-body gap-2',
  lg: 'h-12 px-5 text-body gap-2',
};

/**
 * The one button in the product.
 *
 * Never two `primary` buttons in one action group — the primary is the thing we want done.
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    leadingIcon: LeadingIcon,
    trailingIcon: TrailingIcon,
    loading = false,
    disabled = false,
    fullWidth = false,
    as: Component = 'button',
    className,
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <Component
      ref={ref}
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-input transition-colors',
        'focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2',
        'active:scale-[0.98] motion-reduce:active:scale-100',
        VARIANTS[variant],
        variant !== 'link' && SIZES[size],
        fullWidth && 'w-full',
        isDisabled && 'cursor-not-allowed opacity-50 active:scale-100',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 14 : 16} />
      ) : (
        LeadingIcon && <LeadingIcon size={size === 'sm' ? 14 : 16} aria-hidden="true" />
      )}
      {children}
      {TrailingIcon && !loading && (
        <TrailingIcon size={size === 'sm' ? 14 : 16} aria-hidden="true" />
      )}
    </Component>
  );
});

