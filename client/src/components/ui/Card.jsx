import { cn } from '@/lib/cn.js';

/**
 * The surface everything sits on: white, a 1px line border, 10px radius, no shadow.
 * Borders over shadows is the house style (DESIGN.md section 4).
 */
export function Card({
  title,
  description,
  actions,
  footer,
  padded = true,
  className,
  children,
  ...props
}) {
  const hasHeader = title || description || actions;

  return (
    <section
      className={cn('overflow-hidden rounded-card border border-line bg-surface', className)}
      {...props}
    >
      {hasHeader && (
        <header
          className={cn(
            'flex items-start justify-between gap-4 border-b border-line px-5 py-4 md:px-6',
          )}
        >
          <div className="min-w-0">
            {title && <h3 className="text-h3 text-ink">{title}</h3>}
            {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}

      <div className={cn(padded && 'p-5 md:p-6')}>{children}</div>

      {footer && (
        <footer className="border-t border-line bg-paper px-5 py-3 md:px-6">{footer}</footer>
      )}
    </section>
  );
}
