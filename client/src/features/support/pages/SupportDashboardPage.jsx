import { PageHeader, Card, StatusBadge, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { useSupportDashboard } from '../hooks.js';

function StatCard({ label, value, sub }) {
  return (
    <Card className="p-5">
      <p className="text-small text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value ?? 0}</p>
      {sub && <p className="text-small text-muted mt-0.5">{sub}</p>}
    </Card>
  );
}

export function SupportDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useSupportDashboard();

  if (isLoading) return <div className="flex flex-col gap-6"><PageHeader title="Support dashboard" /><Skeleton className="h-64 w-full" /></div>;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const d = data ?? {};
  const byStatus = d.byStatus ?? {};
  const byPriority = d.byPriority ?? {};

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Support' }]}
        title="Support dashboard"
        subtitle="Overview of all service tickets across all customers."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Open" value={byStatus.OPEN} />
        <StatCard label="Assigned" value={byStatus.ASSIGNED} />
        <StatCard label="Resolved" value={byStatus.RESOLVED} sub="awaiting customer confirmation" />
        <StatCard label="Closed" value={byStatus.CLOSED} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Critical" value={byPriority.CRITICAL} />
        <StatCard label="High" value={byPriority.HIGH} />
        <StatCard label="Medium" value={byPriority.MEDIUM} />
      </div>
    </div>
  );
}
