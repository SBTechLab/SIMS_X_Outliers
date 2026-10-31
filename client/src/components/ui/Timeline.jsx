import { cn } from '@/lib/cn.js';
import { formatDateTime, timeAgo } from '@/lib/format.js';

/**
 * A vertical rail with dated events, used for the project journey, the lead log, the serial
 * history and the ticket log.
 *
 * item: { at, title, actor?, detail?, state: 'done' | 'current' | 'pending' }
 */
export function Timeline({ items, className }) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const dotColour =
          item.state === 'done'
            ? 'bg-leaf'
            : item.state === 'current'
              ? 'bg-sun ring-4 ring-amber-soft'
              : 'bg-line';

        return (
          <li key={i} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', dotColour)} />
              {!isLast && <span className="w-px flex-1 bg-line" />}
            </div>
            <div className={cn('min-w-0 flex-1', !isLast && 'pb-5')}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-body font-medium text-ink">{item.title}</p>
                <time
                  dateTime={item.at}
                  title={formatDateTime(item.at)}
                  className="text-small text-muted tnum"
                >
                  {timeAgo(item.at)}
                </time>
              </div>
              {item.actor && <p className="text-small text-muted">{item.actor}</p>}
              {item.detail && <p className="mt-1 text-small text-ink">{item.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

