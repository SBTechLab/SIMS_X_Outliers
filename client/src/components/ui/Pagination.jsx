import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

/**
 * "Showing 21–40 of 128" on the left, Previous/Next and page numbers on the right.
 * Phone: just Previous and Next with the count between.
 */
export function Pagination({ page, pageSize, total, onPageChange }) {
  if (!total) return null;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const canPrev = page > 1;
  const canNext = page < pages;

  const numbered = pageNumbers(page, pages);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 md:px-6">
      <p className="text-small text-muted">
        Showing <span className="tnum text-ink">{from}</span>–
        <span className="tnum text-ink">{to}</span> of{' '}
        <span className="tnum text-ink">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          leadingIcon={ChevronLeft}
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
        >
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="mx-1 hidden items-center gap-1 md:flex">
          {numbered.map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e${i}`} className="px-1 text-small text-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={
                  p === page
                    ? 'inline-flex h-8 min-w-[32px] items-center justify-center rounded-input bg-ink text-small text-white'
                    : 'inline-flex h-8 min-w-[32px] items-center justify-center rounded-input text-small text-ink hover:bg-ink-tint focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2'
                }
              >
                {p}
              </button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          trailingIcon={ChevronRight}
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
        >
          <span className="hidden sm:inline">Next</span>
        </Button>
      </div>
    </div>
  );
}

/** First, last, current ±1, ellipses between — the standard shape. */
function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...items].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i += 1) {
    out.push(sorted[i]);
    if (sorted[i + 1] && sorted[i + 1] - sorted[i] > 1) out.push('ellipsis');
  }
  return out;
}

