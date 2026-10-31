import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, DataTable, StatusBadge, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useDispatches } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'READY', label: 'Ready' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
];

const columns = [
  { key: 'number', header: 'Dispatch', render: (r) => <Link to={`/warehouse/dispatches/${r.id}`} className="font-mono text-small text-sun hover:underline">{r.number}</Link> },
  {
    key: 'project', header: 'Project',
    render: (r) => (
      <div>
        <div className="font-medium font-mono text-small">{r.project?.code}</div>
        <div className="text-small text-muted">{r.project?.customer?.name}</div>
      </div>
    ),
  },
  { key: 'city', header: 'City', render: (r) => r.project?.customer?.city ?? '—' },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge enumName="DispatchStatus" value={r.status} /> },
  { key: 'lines', header: 'Lines', render: (r) => r._count?.lines ?? 0 },
  { key: 'dispatchedAt', header: 'Dispatched', render: (r) => r.dispatchedAt ? formatDate(r.dispatchedAt) : '—' },
  { key: 'deliveredAt', header: 'Delivered', render: (r) => r.deliveredAt ? formatDate(r.deliveredAt) : '—' },
];

export function DispatchesPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useDispatches({ status: status || undefined, page, pageSize: 20 });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ to: '/warehouse', label: 'Warehouse' }, { label: 'Dispatches' }]}
        title="Dispatches"
        subtitle="Scan every serialized unit before dispatch (BR-07). Click a dispatch to open the packing screen."
      />

      <div className="flex gap-2">
        <select
          className="border border-line rounded-md px-3 py-2 text-body bg-white text-ink"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        rows.length === 0 ? <EmptyState title="No dispatches" description="Dispatches are created automatically when a project is confirmed." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
