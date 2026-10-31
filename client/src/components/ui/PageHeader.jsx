import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn.js';

/**
 * The title block at the top of every page: breadcrumb, title, optional subtitle, actions,
 * and an optional background photo with a 70% ink overlay.
 *
 * The background photo is only used on section landing pages — never above a table or a form
 * (DESIGN.md section 7).
 */
export function PageHeader({
  breadcrumb,
  title,
  subtitle,
  actions,
  backgroundImage,
  className,
}) {
  const dark = Boolean(backgroundImage);

  return (
    <header
      className={cn(
        'relative overflow-hidden',
        dark ? 'min-h-[160px] rounded-card' : 'py-6',
        className,
      )}
    >
      {backgroundImage && (
        <>
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-ink/70" aria-hidden="true" />
        </>
      )}

      <div
        className={cn(
          'relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between',
          dark && 'p-6 md:p-8',
        )}
      >
        <div className="min-w-0">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-small">
              {breadcrumb.map((item, i) => {
                const last = i === breadcrumb.length - 1;
                const colour = dark ? 'text-white/70' : 'text-muted';
                return (
                  <span key={i} className="flex items-center gap-1">
                    {item.to && !last ? (
                      <Link to={item.to} className={cn('hover:underline', colour)}>
                        {item.label}
                      </Link>
                    ) : (
                      <span className={last ? (dark ? 'text-white' : 'text-ink') : colour}>
                        {item.label}
                      </span>
                    )}
                    {!last && <ChevronRight size={14} className={colour} aria-hidden="true" />}
                  </span>
                );
              })}
            </nav>
          )}

          <h1 className={cn('text-h1', dark ? 'text-white' : 'text-ink')}>{title}</h1>
          {subtitle && (
            <p className={cn('mt-1 text-body', dark ? 'text-white/80' : 'text-muted')}>
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

