import { forwardRef, useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn.js';

/**
 * A checkbox with a clickable label and a 44px touch row on mobile.
 *
 * The native input stays in the DOM (visually hidden) so keyboard and screen-reader
 * behaviour is the browser's, not ours.
 */
export const Checkbox = forwardRef(function Checkbox(
  { id: providedId, label, hint, error, disabled, className, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={id}
        className={cn(
          'flex min-h-[44px] cursor-pointer items-center gap-2.5 md:min-h-0',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[4px] border border-line bg-surface transition-colors checked:border-sun checked:bg-sun focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            {...props}
          />
          <Check
            size={13}
            strokeWidth={3}
            className="pointer-events-none relative hidden text-ink peer-checked:block"
            aria-hidden="true"
          />
        </span>
        {label && <span className="text-body text-ink">{label}</span>}
      </label>
      {hint && !error && <p className="ml-7 text-small text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="ml-7 text-small text-alert">
          {error}
        </p>
      )}
    </div>
  );
});

