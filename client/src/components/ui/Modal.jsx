import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { IconButton } from './IconButton.jsx';
import { backdrop, modalPanel } from '@/lib/motion.js';

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

/**
 * A centred overlay for short confirmations and small forms.
 *
 * Detail views go in a Drawer so the list stays visible. Focus is trapped by the browser via
 * the inert-background pattern (DESIGN.md section 10): backdrop click and Esc close, unless
 * `dismissible` is false.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            {...backdrop}
            className="absolute inset-0 bg-ink/40"
            onClick={() => dismissible && onClose?.()}
            aria-hidden="true"
          />
          <motion.div
            {...modalPanel}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            tabIndex={-1}
            className={cn(
              'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-card bg-surface shadow-md',
              SIZES[size],
            )}
          >
            {(title || dismissible) && (
              <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  {title && (
                    <h2 id="modal-title" className="text-h2 text-ink">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-1 text-small text-muted">{description}</p>}
                </div>
                {dismissible && (
                  <IconButton icon={X} label="Close" variant="ghost" onClick={onClose} />
                )}
              </header>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-line bg-paper px-5 py-3">
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

