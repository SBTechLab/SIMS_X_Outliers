import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck } from 'lucide-react';
import { api } from '@/lib/api.js';
import { PageHeader, Card, Button, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { timeAgo } from '@/lib/format.js';
import { cn } from '@/lib/cn.js';

export function NotificationsPage() {
  const [isRead, setIsRead] = useState(undefined);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const params = { page, pageSize: 20, ...(isRead !== undefined ? { isRead } : {}) };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications', 'list', params],
    queryFn: () => api.get('/notifications', { params }),
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

  const rows = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Notifications' }]} title="Notifications" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Notifications' }]}
        title="Notifications"
        subtitle="System alerts for your role. Older than 30 days are archived automatically."
        actions={
          <Button variant="outline" size="sm" leading={CheckCheck} onClick={() => markAll.mutate()} loading={markAll.isPending}>
            Mark all as read
          </Button>
        }
      />

      <div className="flex gap-2">
        {[
          { label: 'All', value: undefined },
          { label: 'Unread', value: false },
          { label: 'Read', value: true },
        ].map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => { setIsRead(opt.value); setPage(1); }}
            className={cn(
              'rounded-full border px-3 py-1 text-small transition-colors',
              isRead === opt.value
                ? 'border-sun bg-sun text-white'
                : 'border-line bg-surface text-ink hover:bg-paper',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No notifications" description="You will see alerts here when something needs your attention." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((n) => (
            <Card
              key={n.id}
              className={cn(
                'cursor-pointer p-4 transition-colors hover:bg-paper',
                !n.isRead && 'border-l-4 border-l-sun',
              )}
              onClick={() => {
                if (!n.isRead) markOne.mutate(n.id);
                if (n.link) navigate(n.link);
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={cn('font-medium text-ink', !n.isRead && 'font-semibold')}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-small text-muted">{n.body}</p>}
                </div>
                <span className="shrink-0 text-micro text-muted tabular-nums">{timeAgo(n.createdAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-small text-muted">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
