import { useId } from 'react';
import { cn } from '@/lib/cn.js';

/**
 * A settings toggle. For settings, not for form submission — a form uses a Checkbox, because
 * a switch implies the change takes effect immediately.
 */
export function Switch({ id: providedId, label, hint, checked, onChange, disabled, className }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col gap-0.5">
        {label && (
          <label htmlFor={id} className="cursor-pointer text-body text-ink">
            {label}
          </label>
        )}
        {hint && <p className="text-small text-muted">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2',
          checked ? 'bg-sun' : 'bg-ink-tint',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={cn(
            'inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-150',
            checked ? 'translate-x-[20px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

