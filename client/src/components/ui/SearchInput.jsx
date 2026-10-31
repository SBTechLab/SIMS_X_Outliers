import { forwardRef, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn.js';

/**
 * A debounced search box. Clear button appears when non-empty; Esc clears.
 *
 * The placeholder names the fields searched, so the user does not have to guess
 * ("Search by name, phone, serial or project code").
 */
export const SearchInput = forwardRef(function SearchInput(
  {
    value: controlledValue,
    defaultValue = '',
    onChange,
    onSubmit,
    placeholder = 'Search',
    debounce = 300,
    className,
    ...props
  },
  ref,
) {
  const isControlled = controlledValue !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = isControlled ? controlledValue : internal;

  const timeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const emit = (next) => {
    if (!isControlled) setInternal(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onChange?.(next), debounce);
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 text-muted"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        role="searchbox"
        value={current}
        onChange={(e) => emit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (!isControlled) setInternal('');
            onChange?.('');
          } else if (e.key === 'Enter' && onSubmit) {
            onSubmit(current);
          }
        }}
        placeholder={placeholder}
        className="h-10 w-full rounded-input border border-line bg-surface pl-9 pr-9 text-body text-ink placeholder:text-muted focus:border-sun focus:outline-none focus:ring-2 focus:ring-sun"
        {...props}
      />
      {current && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            if (!isControlled) setInternal('');
            onChange?.('');
          }}
          className="absolute right-2 rounded-input p-1 text-muted hover:bg-ink-tint hover:text-ink focus-visible:ring-2 focus-visible:ring-sun"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

