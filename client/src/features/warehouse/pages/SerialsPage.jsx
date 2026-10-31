import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, SearchInput, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useSerials } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'UNDER_REPAIR', label: 'Under repair' },
];

const columns = [
  { key: 'serialNumber', header: 'Serial number', render: (r) => <span className="font-mono text-small">{r.serialNumber}</span> },
  { key: 'product', header: 'Product', render: (r) => <span className="font-medium">{r.product?.name}</span> },
  { key: 'category', header: 'Category', render: (r) => r.product?.category?.replace(/_/g, ' ') ?? '—' },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge enumName="SerialStatus" value={r.status} /> },
  { key: 'project', header: 'Project', render: (r) => r.project?.code ?? '—' },
  {
    key: 'warranty', header: 'Warranty',
    render: (r) => {
      if (!r.warranty) return <span className="text-muted">—</span>;
      const expired = new Date() > new Date(r.warranty.endDate);
      const voided = !!r.warranty.voidReason;
      const label = voided ? 'Void' : expired ? 'Expired' : 'Active';
      const color = voided || expired ? 'text-alert' : 'text-leaf';
      return <span className={color}>{label}</span>;
    },
  },
  { key: 'createdAt', header: 'Received', render: (r) => formatDate(r.createdAt) },
];

export function SerialsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useSerials({
    search: search || undefined,
    status: status || undefined,
    page,
    pageSize: 30,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ to: '/warehouse', label: 'Warehouse' }, { label: 'Serials' }]}
        title="Serial numbers"
        subtitle="Full history for every unit — purchase, dispatch, delivery, tickets (BR-08)."
      />

      <div className="flex gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search serial number" className="w-64" />
        <select
          className="border border-line rounded-md px-3 py-2 text-body bg-white text-ink"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        rows.length === 0 ? <EmptyState title="No serial units" description="Serial units will appear when purchases are recorded." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
