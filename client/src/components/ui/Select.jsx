import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { Field, controlClasses } from './Field.jsx';

/**
 * A native select styled to match Input.
 *
 * Options come from lib/constants.js — a screen never hard-codes an enum value.
 * Native is deliberate: it is keyboard accessible for free and uses the OS picker on a phone,
 * which is far better one-handed than any custom dropdown we would build.
 */
export const Select = forwardRef(function Select(
  {
    id: providedId,
    label,
    hint,
    error,
    required,
    options = [],
    placeholder,
    size = 'md',
    className,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {({ describedBy }) => (
        <div className="relative">
          <select
            ref={ref}
            id={id}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={controlClasses({
              error,
              size,
              className: cn('appearance-none pr-9', className),
            })}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
        </div>
      )}
    </Field>
  );
});

