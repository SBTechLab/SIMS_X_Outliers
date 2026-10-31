import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn.js';
import { Field, controlClasses } from './Field.jsx';

/**
 * A text, number, email, tel or password input.
 *
 * Money inputs pass prefix="₹" and get tabular figures, so a column of amounts lines up.
 */
export const Input = forwardRef(function Input(
  {
    id: providedId,
    label,
    hint,
    error,
    required,
    prefix,
    suffix,
    size = 'md',
    money = false,
    className,
    wrapperClassName,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      {({ describedBy }) => (
        <div className="relative flex items-center">
          {prefix && (
            <span className="pointer-events-none absolute left-3 text-body text-muted">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={controlClasses({
              error,
              size,
              className: cn(prefix && 'pl-8', suffix && 'pr-12', money && 'tnum', className),
            })}
            {...props}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3 text-small text-muted">
              {suffix}
            </span>
          )}
        </div>
      )}
    </Field>
  );
});

