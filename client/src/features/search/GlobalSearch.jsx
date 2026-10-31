import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '@/lib/api.js';
import { cn } from '@/lib/cn.js';
import { popIn } from '@/lib/motion.js';

const TYPE_LABEL = {
  customer: 'Customer',
  project: 'Project',
  lead: 'Lead',
  serial: 'Serial',
  ticket: 'Ticket',
};

const TYPE_COLOR = {
  customer: 'text-sky',
  project: 'text-leaf',
  lead: 'text-sun',
  serial: 'text-muted',
  ticket: 'text-alert',
};

export function GlobalSearch({ className }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => api.get('/search', { params: { q: query } }),
    enabled: query.length >= 2,
    staleTime: 10_000,
  });

  const allResults = data
    ? [
        ...(data.leads ?? []),
        ...(data.customers ?? []),
        ...(data.projects ?? []),
        ...(data.serials ?? []),
        ...(data.tickets ?? []),
      ]
    : [];

  useEffect(() => { setHighlighted(0); }, [query]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function pick(item) {
    navigate(item.link);
    setQuery('');
    setOpen(false);
  }

  const showDropdown = open && query.length >= 2;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Search size={16} className="pointer-events-none absolute left-3 text-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setQuery(''); setOpen(false); }
            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, allResults.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
            if (e.key === 'Enter' && allResults[highlighted]) pick(allResults[highlighted]);
          }}
          placeholder="Search — Ctrl+K"
          className="h-9 w-full rounded-input border border-line bg-paper pl-9 pr-3 text-body text-ink placeholder:text-muted focus:border-sun focus:outline-none focus:ring-2 focus:ring-sun"
        />
        {isFetching && (
          <div className="pointer-events-none absolute right-3 h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-sun" />
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            {...popIn}
            role="listbox"
            className="absolute left-0 top-full z-50 mt-1 w-full min-w-[360px] overflow-hidden rounded-card border border-line bg-surface shadow-md"
          >
            {allResults.length === 0 ? (
              <p className="px-4 py-6 text-center text-small text-muted">
                {isFetching ? 'Searching…' : 'No results found.'}
              </p>
            ) : (
              <ul>
                {allResults.map((item, i) => (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === highlighted}
                      onClick={() => pick(item)}
                      onMouseEnter={() => setHighlighted(i)}
                      className={cn(
                        'flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left last:border-0 transition-colors',
                        i === highlighted ? 'bg-paper' : 'hover:bg-paper',
                      )}
                    >
                      <span className={cn('shrink-0 text-micro font-medium uppercase tracking-wide w-14', TYPE_COLOR[item.type])}>
                        {TYPE_LABEL[item.type]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{item.label}</span>
                        {item.sub && <span className="block truncate text-small text-muted">{item.sub}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
