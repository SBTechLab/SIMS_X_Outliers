import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn.js';

export const Radio = forwardRef(function Radio(
  { id: providedId, label, hint, disabled, className, ...props },
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
            type="radio"
            disabled={disabled}
            className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full border border-line bg-surface transition-colors checked:border-sun focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            {...props}
          />
          <span
            className="pointer-events-none relative hidden h-2 w-2 rounded-full bg-sun peer-checked:block"
            aria-hidden="true"
          />
        </span>
        {label && <span className="text-body text-ink">{label}</span>}
      </label>
      {hint && <p className="ml-7 text-small text-muted">{hint}</p>}
    </div>
  );
});

/** A labelled group of radios, which is how they are always used in practice. */
export function RadioGroup({ label, name, options, value, onChange, error, className }) {
  return (
    <fieldset className={cn('flex flex-col gap-1.5', className)}>
      {label && <legend className="mb-1 text-label text-ink">{label}</legend>}
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-5">
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-small text-alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

