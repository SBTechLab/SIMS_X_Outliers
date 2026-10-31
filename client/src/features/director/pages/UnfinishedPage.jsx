import {
  PageHeader, Card, StatusBadge, Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { timeAgo, formatDate } from '@/lib/format.js';
import { useUnfinished } from '../hooks.js';

export function UnfinishedPage() {
  const { data, isLoading, isError, error, refetch } = useUnfinished();

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Director' }, { label: 'Unfinished work' }]} title="Unfinished work" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  const d = data?.data ?? {};
  const stalledProjects = d.stalledProjects ?? [];
  const overdueLeads = d.overdueLeads ?? [];
  const openTickets = d.openTickets ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Director' }, { label: 'Reports' }]}
        title="Unfinished work"
        subtitle="Projects that have not progressed, overdue leads, and open tickets."
      />

      <section>
        <h2 className="text-heading font-semibold text-ink mb-3">
          Stalled projects <span className="text-muted font-normal">({stalledProjects.length})</span>
        </h2>
        {stalledProjects.length === 0 ? (
          <EmptyState title="No stalled projects" description="All projects are moving forward." />
        ) : (
          <div className="flex flex-col gap-2">
            {stalledProjects.map((p) => (
              <Card key={p.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-small font-medium">{p.code}</span>
                  <span className="ml-2 text-muted">{p.customer?.name}</span>
                  <span className="ml-2 text-small text-muted">{p.customer?.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge enumName="ProjectStatus" value={p.status} />
                  <span className="text-small text-muted">{timeAgo(p.updatedAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-heading font-semibold text-ink mb-3">
          Overdue leads <span className="text-muted font-normal">({overdueLeads.length})</span>
        </h2>
        {overdueLeads.length === 0 ? (
          <EmptyState title="No overdue leads" description="All new leads have been contacted." />
        ) : (
          <div className="flex flex-col gap-2">
            {overdueLeads.map((l) => (
              <Card key={l.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-small font-medium">{l.code}</span>
                  <span className="ml-2">{l.name}</span>
                </div>
                <div className="text-small text-muted">
                  {l.assignedTo?.name ?? 'Unassigned'} · {timeAgo(l.createdAt)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-heading font-semibold text-ink mb-3">
          Open tickets <span className="text-muted font-normal">({openTickets.length})</span>
        </h2>
        {openTickets.length === 0 ? (
          <EmptyState title="No open tickets" description="Support queue is clear." />
        ) : (
          <div className="flex flex-col gap-2">
            {openTickets.map((t) => (
              <Card key={t.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-small font-medium">{t.number}</span>
                  <span className="ml-2">{t.customer?.name}</span>
                  <span className="ml-2 text-small text-muted">{t.category?.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge enumName="TicketStatus" value={t.status} />
                  <span className="text-small text-muted">{t.assignedTo?.name ?? 'Unassigned'}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
