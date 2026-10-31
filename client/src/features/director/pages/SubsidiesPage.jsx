import { useState } from 'react';
import {
  PageHeader, DataTable, StatusBadge, FilterBar,
  Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { formatINR, formatDate, daysSince } from '@/lib/format.js';
import { useSubsidies } from '../hooks.js';
import { cn } from '@/lib/cn.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'DOCUMENTS_PENDING', label: 'Documents pending' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'INSPECTION_DONE', label: 'Inspection done' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DISBURSED', label: 'Disbursed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const columns = [
  {
    key: 'project',
    header: 'Project',
    render: (row) => (
      <div>
        <div className="font-mono text-small font-medium">{row.project?.code}</div>
        <div className="text-small text-muted">{row.project?.customer?.name}</div>
      </div>
    ),
  },
  { key: 'scheme', header: 'Scheme', render: (row) => <span className="text-small">{row.scheme}</span> },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge enumName="SubsidyStatus" value={row.status} />,
  },
  {
    key: 'daysInStage',
    header: 'Days in stage',
    render: (row) => (
      <span className={cn('tabular-nums text-small', row.daysInStage > 15 ? 'text-alert font-medium' : 'text-muted')}>
        {row.daysInStage}d
      </span>
    ),
  },
  {
    key: 'applicationRef',
    header: 'Ref',
    render: (row) => row.applicationRef ? <span className="font-mono text-small">{row.applicationRef}</span> : <span className="text-muted">—</span>,
  },
  {
    key: 'amountExpected',
    header: 'Expected',
    render: (row) => row.amountExpected ? <span className="tabular-nums">{formatINR(row.amountExpected)}</span> : <span className="text-muted">—</span>,
  },
  {
    key: 'amountReceived',
    header: 'Received',
    render: (row) => row.amountReceived ? <span className="tabular-nums text-leaf">{formatINR(row.amountReceived)}</span> : <span className="text-muted">—</span>,
  },
];

export function SubsidiesPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useSubsidies({ status: status || undefined, page });
  const rows = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  const filters = [
    { type: 'select', id: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Director' }, { label: 'Subsidies' }]} title="Subsidy tracker" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Director' }, { label: 'Finance' }]}
        title="Subsidy tracker"
        subtitle="PM Surya Ghar applications. Rows highlighted in red have been in a stage for over 15 days."
      />

      <FilterBar filters={filters} />

      {rows.length === 0 ? (
        <EmptyState title="No subsidy applications" description={status ? 'Try adjusting filters.' : 'Applications are created automatically for eligible projects when confirmed.'} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}
    </div>
  );
}
