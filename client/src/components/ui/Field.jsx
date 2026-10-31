import { cn } from '@/lib/cn.js';

/**
 * The label, hint and error frame shared by Input, Textarea, Select and DateInput.
 *
 * Why one wrapper: the error wiring (aria-describedby, role="alert") is easy to forget and
 * identical everywhere, and every input in the product must have a real label, not a
 * placeholder standing in for one (DESIGN.md section 10).
 */
export function Field({ id, label, hint, error, required, children, className }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-label text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-alert" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children({ describedBy: cn(hintId, errorId) || undefined })}
      {hint && !error && (
        <p id={hintId} className="text-small text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-small text-alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** The shared control surface, so every field looks the same at rest, on focus and in error. */
export function controlClasses({ error, size = 'md', className } = {}) {
  return cn(
    'w-full rounded-input border bg-surface text-ink placeholder:text-muted',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-sun',
    size === 'lg' ? 'h-12 px-3.5 text-body' : 'h-10 px-3 text-body',
    error ? 'border-alert focus:border-alert focus:ring-alert' : 'border-line focus:border-sun',
    'disabled:cursor-not-allowed disabled:bg-ink-tint disabled:text-muted',
    className,
  );
}

