import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { IconButton } from './IconButton.jsx';
import { backdrop, drawerPanel } from '@/lib/motion.js';

const SIZES = {
  sm: 'sm:w-[400px]',
  md: 'sm:w-[480px] lg:w-[560px]',
  lg: 'sm:w-[560px] lg:w-[720px]',
};

/**
 * A right-side drawer on desktop, a bottom sheet on mobile.
 *
 * The detail view for a lead, a project, a serial, a ticket — the list stays visible behind
 * it, which is the whole point.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  footer,
  dismissible = true,
  children,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    panelRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, dismissible, onClose]);

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex sm:justify-end">
          <motion.div
            {...backdrop}
            className="absolute inset-0 bg-ink/40"
            onClick={() => dismissible && onClose?.()}
            aria-hidden="true"
          />
          <motion.div
            {...drawerPanel(isMobile)}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
            tabIndex={-1}
            className={cn(
              'relative flex w-full flex-col bg-surface shadow-md',
              'max-sm:mt-auto max-sm:h-[90vh] max-sm:rounded-t-card',
              'sm:h-full',
              SIZES[size],
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                {title && (
                  <h2 id="drawer-title" className="text-h2 text-ink">
                    {title}
                  </h2>
                )}
                {subtitle && <p className="mt-0.5 text-small text-muted">{subtitle}</p>}
              </div>
              {dismissible && (
                <IconButton icon={X} label="Close" variant="ghost" onClick={onClose} />
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">{children}</div>

            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-line bg-paper px-5 py-3 md:px-6">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

