import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Lock, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/app/providers.jsx';
import { Avatar } from '@/components/ui/Avatar.jsx';
import { ROLES } from '@/lib/constants.js';
import { popIn } from '@/lib/motion.js';

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-input px-2 py-1.5 hover:bg-ink-tint focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2"
      >
        <Avatar name={user.name} />
        <div className="hidden text-left md:block">
          <p className="text-small font-medium text-ink">{user.name}</p>
          <p className="text-micro uppercase tracking-wider text-muted">
            {ROLES[user.role]?.short ?? user.role}
          </p>
        </div>
        <ChevronDown size={14} className="text-muted" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...popIn}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-card border border-line bg-surface shadow-md"
          >
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-body font-medium text-ink">{user.name}</p>
              <p className="truncate text-small text-muted">{user.email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate('/change-password');
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-body text-ink hover:bg-paper"
            >
              <Lock size={16} aria-hidden="true" />
              Change password
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await logout();
                navigate('/login', { replace: true });
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-body text-alert hover:bg-paper"
            >
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
