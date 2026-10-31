import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { Skeleton } from './Skeleton.jsx';
import { listContainer, listItem, STAGGER_LIMIT } from '@/lib/motion.js';

/**
 * The workhorse table.
 *
 * Mobile: each row collapses into a stacked card — primary cell as the title, the rest as
 * label/value pairs. Tables never scroll horizontally on a phone (DESIGN.md section 5).
 *
 * Columns:
 *   { key, label, width?, align?, numeric?, primary?, hideBelow?, render?, cellClassName? }
 *   - numeric: adds tabular figures and right alignment — mandatory on money.
 *   - primary: becomes the title in the mobile stacked view.
 *   - hideBelow: 'md' hides this column in the desktop table on small screens.
 *   - render: (row) → ReactNode, for a column that is not a simple field read.
 */
export function DataTable({
  columns,
  rows,
  loading,
  empty,
  onRowClick,
  sort,
  onSortChange,
  rowKey = 'id',
  stickyHeader = false,
  dense = false,
  className,
}) {
  const key = (row, i) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? i);

  const primaryColumn = useMemo(() => columns.find((c) => c.primary) ?? columns[0], [columns]);

  if (loading) {
    return <Skeleton variant="table" rows={6} columns={columns.map((c) => c.width ?? 20)} />;
  }

  if (!rows || rows.length === 0) {
    return (
      <div className={cn('overflow-hidden rounded-card border border-line bg-surface', className)}>
        {empty}
      </div>
    );
  }

  return (
    <div className={cn('rounded-card border border-line bg-surface', className)}>
      {/* Desktop: real table from md up. */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead
            className={cn(
              'border-b border-line bg-paper',
              stickyHeader && 'sticky top-topbar z-10 shadow-sm',
            )}
          >
            <tr>
              {columns.map((col) => (
                <HeaderCell
                  key={col.key}
                  col={col}
                  sort={sort}
                  onSortChange={onSortChange}
                  dense={dense}
                />
              ))}
            </tr>
          </thead>
          <motion.tbody {...listContainer}>
            {rows.map((row, i) => (
              <motion.tr
                key={key(row, i)}
                {...(i < STAGGER_LIMIT ? listItem : {})}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : -1}
                onKeyDown={(e) => {
                  if (!onRowClick) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                className={cn(
                  'border-b border-line last:border-0',
                  onRowClick &&
                    'cursor-pointer transition-colors hover:bg-paper focus-visible:bg-paper',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'align-middle text-body text-ink',
                      dense ? 'h-10 px-3' : 'h-12 px-4',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.numeric && 'tnum',
                      col.hideBelow === 'md' && 'hidden md:table-cell',
                      col.hideBelow === 'lg' && 'hidden lg:table-cell',
                      col.cellClassName,
                    )}
                  >
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

      {/* Mobile: stacked cards. */}
      <motion.ul {...listContainer} className="divide-y divide-line md:hidden">
        {rows.map((row, i) => (
          <motion.li
            key={key(row, i)}
            {...(i < STAGGER_LIMIT ? listItem : {})}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onKeyDown={(e) => {
              if (!onRowClick) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick(row);
              }
            }}
            tabIndex={onRowClick ? 0 : -1}
            className={cn(
              'flex min-h-[64px] flex-col gap-2 px-4 py-3',
              onRowClick && 'cursor-pointer transition-colors hover:bg-paper focus-visible:bg-paper',
            )}
          >
            <div className="text-body font-medium text-ink">
              {primaryColumn.render ? primaryColumn.render(row) : row[primaryColumn.key] ?? '—'}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {columns
                .filter((col) => col.key !== primaryColumn.key)
                .map((col) => (
                  <div key={col.key} className="flex items-baseline gap-1.5 text-small">
                    <span className="text-muted">{col.label}</span>
                    <span className={cn('text-ink', col.numeric && 'tnum')}>
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </span>
                  </div>
                ))}
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

function HeaderCell({ col, sort, onSortChange, dense }) {
  const sortable = Boolean(col.sortKey && onSortChange);
  const activeDir = sort?.key === col.sortKey ? sort.direction : null;

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-label uppercase tracking-wide text-muted',
        col.align === 'right' && 'flex-row-reverse',
        col.align === 'center' && 'justify-center',
      )}
    >
      {col.label}
      {sortable &&
        (activeDir === 'asc' ? (
          <ChevronUp size={14} aria-hidden="true" />
        ) : activeDir === 'desc' ? (
          <ChevronDown size={14} aria-hidden="true" />
        ) : null)}
    </span>
  );

  return (
    <th
      scope="col"
      aria-sort={activeDir ? (activeDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={col.width ? { width: col.width } : undefined}
      className={cn(
        'text-left',
        dense ? 'h-9 px-3' : 'h-11 px-4',
        col.align === 'right' && 'text-right',
        col.align === 'center' && 'text-center',
        col.hideBelow === 'md' && 'hidden md:table-cell',
        col.hideBelow === 'lg' && 'hidden lg:table-cell',
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => {
            const next =
              sort?.key === col.sortKey && sort?.direction === 'asc' ? 'desc' : 'asc';
            onSortChange({ key: col.sortKey, direction: next });
          }}
          className="inline-flex items-center gap-1 rounded-input focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  );
}

