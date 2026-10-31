import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';
import { timeAgo } from '@/lib/format.js';
import { popIn } from '@/lib/motion.js';
import { cn } from '@/lib/cn.js';
import { IconButton } from '@/components/ui/IconButton.jsx';
import { Button } from '@/components/ui/Button.jsx';

/**
 * The bell. Polls /notifications/unread-count every 30s and shows the dot when non-zero.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: count } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count'),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const { data: list } = useQuery({
    queryKey: ['notifications', 'preview'],
    queryFn: () => api.get('/notifications', { params: { pageSize: 10 } }),
    enabled: open,
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        icon={Bell}
        label={count?.count ? `Notifications (${count.count} unread)` : 'Notifications'}
        onClick={() => setOpen((v) => !v)}
        className="relative text-ink"
      />
      {count?.count > 0 && (
        <span
          className="pointer-events-none absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sun"
          aria-hidden="true"
        />
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            {...popIn}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-card border border-line bg-surface shadow-md"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-body font-semibold text-ink">Notifications</p>
              {count?.count > 0 && (
                <Button variant="link" onClick={() => markAll.mutate()}>
                  Mark all as read
                </Button>
              )}
            </div>

            <ul className="max-h-[400px] overflow-y-auto">
              {!list || list.length === 0 ? (
                <li className="px-4 py-10 text-center text-small text-muted">
                  No notifications yet.
                </li>
              ) : (
                list.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.isRead) markOne.mutate(n.id);
                        if (n.link) {
                          navigate(n.link);
                          setOpen(false);
                        }
                      }}
                      className={cn(
                        'flex w-full flex-col items-start gap-0.5 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-paper',
                        !n.isRead && 'bg-amber-soft/40',
                      )}
                    >
                      <p className="text-body font-medium text-ink">{n.title}</p>
                      {n.body && <p className="text-small text-muted">{n.body}</p>}
                      <p className="text-micro text-muted tnum">{timeAgo(n.createdAt)}</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-line px-4 py-2.5">
              <button
                type="button"
                onClick={() => { navigate('/notifications'); setOpen(false); }}
                className="text-small text-sun hover:underline"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
