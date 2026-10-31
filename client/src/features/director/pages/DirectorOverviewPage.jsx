import { useState } from 'react';
import { TrendingUp, TrendingDown, Zap, Users, FileText, AlertTriangle } from 'lucide-react';
import {
  PageHeader, StatCard, Card, Skeleton, ErrorState, FilterBar,
} from '@/components/ui';
import { formatINR, formatDate } from '@/lib/format.js';
import { useOverview } from '../hooks.js';

const RANGE_OPTIONS = [
  { value: '', label: 'All time' },
  { value: 'month', label: 'This month' },
  { value: 'week', label: 'This week' },
];

function buildParams(range) {
  const now = new Date();
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (range === 'week') {
    const start = new Date(now.getTime() - 7 * 86400_000);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  return {};
}

export function DirectorOverviewPage() {
  const [range, setRange] = useState('month');
  const params = buildParams(range);
  const { data, isLoading, isError, error, refetch } = useOverview(params);

  const filters = [
    { type: 'select', id: 'range', label: 'Period', value: range, onChange: setRange, options: RANGE_OPTIONS },
  ];

  if (isLoading) return <PageSkeleton />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Director' }]} title="Overview" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  const d = data?.data ?? {};

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Director' }]}
        title="Overview"
        subtitle="Company-wide metrics for the selected period."
      />

      <FilterBar filters={filters} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Revenue invoiced"
          value={formatINR(d.finance?.invoiced ?? 0)}
          icon={FileText}
        />
        <StatCard
          label="Collected"
          value={formatINR(d.finance?.collected ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          label="Outstanding"
          value={formatINR(d.finance?.outstanding ?? 0)}
          icon={TrendingDown}
          variant={parseFloat(d.finance?.outstanding ?? 0) > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Capacity installed"
          value={`${d.capacity?.totalKw ?? 0} kW`}
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-semibold text-ink mb-3">Lead funnel</h3>
          <div className="flex flex-col gap-2 text-body">
            <div className="flex justify-between">
              <span className="text-muted">Total leads</span>
              <span className="font-medium">{d.leads?.total ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Won</span>
              <span className="font-medium text-leaf">{d.leads?.won ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Lost</span>
              <span className="font-medium text-alert">{d.leads?.lost ?? 0}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 mt-1">
              <span className="text-muted">Conversion</span>
              <span className="font-medium">{d.leads?.conversionRate ?? 0}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink mb-3">Projects</h3>
          <div className="flex flex-col gap-2 text-body">
            <div className="flex justify-between">
              <span className="text-muted">Confirmed</span>
              <span className="font-medium">{d.projects?.confirmed ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Installed</span>
              <span className="font-medium">{d.projects?.installed ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Closed</span>
              <span className="font-medium text-leaf">{d.projects?.closed ?? 0}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink mb-3">Service</h3>
          <div className="flex flex-col gap-2 text-body">
            <div className="flex justify-between">
              <span className="text-muted">Open tickets</span>
              <span className={`font-medium ${(d.support?.activeTickets ?? 0) > 5 ? 'text-alert' : ''}`}>
                {d.support?.activeTickets ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Subsidy disbursed</span>
              <span className="font-medium">{formatINR(d.subsidy?.disbursed ?? 0)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    </div>
  );
}
