import { forwardRef, useId } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { Field, controlClasses } from './Field.jsx';

/**
 * A native date or datetime-local input.
 *
 * Displays IST and submits an ISO string. Native again: the OS date picker is better than
 * anything we would build, and it is keyboard accessible for free.
 */
export const DateInput = forwardRef(function DateInput(
  { id: providedId, label, hint, error, required, withTime = false, size = 'md', className, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {({ describedBy }) => (
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={withTime ? 'datetime-local' : 'date'}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={controlClasses({ error, size, className: cn('pr-9', className) })}
            {...props}
          />
          <Calendar
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
        </div>
      )}
    </Field>
  );
});

