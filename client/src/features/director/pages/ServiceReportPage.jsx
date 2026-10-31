import {
  PageHeader, Card, Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { useServiceReport } from '../hooks.js';

export function ServiceReportPage() {
  const { data, isLoading, isError, error, refetch } = useServiceReport();

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Director' }, { label: 'Service' }]} title="Service report" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  const d = data?.data ?? {};
  const byCategory = d.byCategory ?? [];
  const avgHours = d.avgResolution?.[0]?.avg_hours;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Director' }, { label: 'Reports' }]}
        title="Service report"
        subtitle="Ticket breakdown by category, chargeability, and average resolution time over the last 90 days."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-ink mb-3">Tickets by category</h3>
          {byCategory.length === 0 ? (
            <EmptyState title="No ticket data" description="Tickets will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {byCategory.map((row, i) => (
                <div key={i} className="flex items-center justify-between text-body">
                  <div>
                    <span>{row.category?.replace(/_/g, ' ')}</span>
                    <span className="ml-2 text-small text-muted">
                      {row.isChargeable ? 'Chargeable' : 'Free (warranty)'}
                    </span>
                  </div>
                  <span className="font-medium tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink mb-3">Average resolution time</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums text-ink">
              {avgHours ? Number(avgHours).toFixed(1) : '—'}
            </span>
            {avgHours && <span className="text-muted mb-1">hours</span>}
          </div>
          <p className="text-small text-muted mt-2">Over the last 90 days, from ticket creation to resolution.</p>
        </Card>
      </div>
    </div>
  );
}
