import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn.js';
import { Field } from './Field.jsx';

export const Textarea = forwardRef(function Textarea(
  { id: providedId, label, hint, error, required, rows = 3, maxLength, value, className, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const used = typeof value === 'string' ? value.length : null;

  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {({ describedBy }) => (
        <div className="relative">
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            maxLength={maxLength}
            value={value}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'w-full resize-y rounded-input border bg-surface px-3 py-2.5 text-body text-ink',
              'placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-sun',
              error ? 'border-alert focus:ring-alert' : 'border-line focus:border-sun',
              'disabled:cursor-not-allowed disabled:bg-ink-tint disabled:text-muted',
              className,
            )}
            {...props}
          />
          {maxLength && used !== null && (
            <span className="absolute bottom-2 right-3 text-micro text-muted tnum">
              {used}/{maxLength}
            </span>
          )}
        </div>
      )}
    </Field>
  );
});

