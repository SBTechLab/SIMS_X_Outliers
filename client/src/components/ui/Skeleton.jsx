import { cn } from '@/lib/cn.js';

/**
 * Loading placeholders shaped like the content that is coming, so the layout does not jump.
 * Never a full-page spinner (DESIGN.md section 13).
 *
 * The shimmer becomes a static tint under prefers-reduced-motion, handled in styles/index.css.
 */
export function Skeleton({ variant = 'text', rows = 3, columns, height, className }) {
  if (variant === 'text') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-4"
            // Varied widths read as text rather than as bars.
            style={{ width: `${[88, 72, 80, 64, 76][i % 5]}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'block') {
    return <div className={cn('skeleton', className)} style={{ height: height ?? 120 }} />;
  }

  if (variant === 'circle') {
    return (
      <div
        className={cn('skeleton rounded-full', className)}
        style={{ height: height ?? 32, width: height ?? 32 }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('rounded-card border border-line bg-surface p-5', className)}>
        <div className="skeleton mb-3 h-4 w-1/3" />
        <div className="skeleton mb-2 h-8 w-1/2" />
        <div className="skeleton h-3 w-1/4" />
      </div>
    );
  }

  if (variant === 'stats') {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  // variant === 'table'
  const cols = columns ?? [36, 22, 18, 14, 10];
  return (
    <div className={cn('overflow-hidden rounded-card border border-line bg-surface', className)}>
      <div className="flex gap-4 border-b border-line bg-paper px-4 py-3">
        {cols.map((width, i) => (
          <div key={i} className="skeleton h-3" style={{ width: `${width}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-0">
          {cols.map((width, i) => (
            <div key={i} className="skeleton h-4" style={{ width: `${width}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

