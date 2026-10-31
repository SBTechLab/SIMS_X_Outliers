import { createContext, useContext, useId } from 'react';
import { cn } from '@/lib/cn.js';

const TabsContext = createContext(null);

export function Tabs({ value, onChange, children, className }) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={cn('flex flex-col gap-4', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className }) {
  return (
    <div
      role="tablist"
      className={cn('no-scrollbar flex gap-6 overflow-x-auto border-b border-line', className)}
    >
      {children}
    </div>
  );
}

export function Tab({ value, children, disabled, className }) {
  const ctx = useContext(TabsContext);
  const id = useId();
  const active = ctx?.value === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${id}-tab`}
      aria-selected={active}
      aria-controls={`${id}-panel`}
      disabled={disabled}
      onClick={() => ctx?.onChange?.(value)}
      className={cn(
        'relative whitespace-nowrap px-1 py-3 text-body transition-colors',
        'focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2',
        active ? 'font-semibold text-ink' : 'text-muted hover:text-ink',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-sun" aria-hidden="true" />}
    </button>
  );
}

export function TabPanel({ value, children, className }) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;

  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}

