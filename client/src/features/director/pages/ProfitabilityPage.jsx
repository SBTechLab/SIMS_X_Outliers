import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, DataTable, StatusBadge, SearchInput, FilterBar,
  Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { formatINR, formatPercent } from '@/lib/format.js';
import { useProfitability } from '../hooks.js';
import { cn } from '@/lib/cn.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'INSTALLED', label: 'Installed' },
  { value: 'CLOSED', label: 'Closed' },
];

const columns = [
  {
    key: 'code',
    header: 'Project',
    render: (row) => (
      <div>
        <div className="font-mono text-small font-medium">{row.code}</div>
        <div className="text-small text-muted">{row.customer?.name}</div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge enumName="ProjectStatus" value={row.status} />,
  },
  {
    key: 'revenue',
    header: 'Revenue',
    render: (row) => (
      <div className="text-right tabular-nums">
        {formatINR(row.profit?.revenue ?? 0)}
        {row.profit?.isEstimated && <span className="text-muted text-small ml-1">(est.)</span>}
      </div>
    ),
  },
  {
    key: 'cost',
    header: 'Total cost',
    render: (row) => (
      <div className="text-right tabular-nums text-muted">{formatINR(row.profit?.totalCost ?? 0)}</div>
    ),
  },
  {
    key: 'profit',
    header: 'Profit',
    render: (row) => {
      const p = row.profit;
      if (!p) return <span className="text-muted">—</span>;
      return (
        <div className={cn('text-right tabular-nums font-medium', p.isLoss ? 'text-alert' : 'text-leaf')}>
          {formatINR(p.profit)}
        </div>
      );
    },
  },
  {
    key: 'margin',
    header: 'Margin',
    render: (row) => {
      const p = row.profit;
      if (!p) return <span className="text-muted">—</span>;
      return (
        <div className={cn('text-right tabular-nums', p.isLoss ? 'text-alert' : '')}>
          {p.margin}%
        </div>
      );
    },
  },
];

export function ProfitabilityPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useProfitability({ status: status || undefined, page, pageSize: 20 });
  const rows = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  const filters = [
    { type: 'select', id: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Director' }, { label: 'Profitability' }]} title="Profitability" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Director' }, { label: 'Reports' }]}
        title="Profitability"
        subtitle="Project revenue, cost breakdown, and margin. Estimated values use quote totals before the tax invoice is issued."
      />

      <FilterBar filters={filters} />

      {rows.length === 0 ? (
        <EmptyState title="No projects found" description="Projects will appear here once confirmed." />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(row) => navigate(`/director/profitability/${row.id}`)}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}
    </div>
  );
}
