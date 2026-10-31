import { useState } from 'react';
import { PageHeader, DataTable, SearchInput, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useWarranties } from '../hooks.js';
import { cn } from '@/lib/cn.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'VOID', label: 'Void' },
];

function WarrantyStatus({ row }) {
  const voided = !!row.voidReason;
  const expired = !voided && new Date() > new Date(row.endDate);
  const label = voided ? 'Void' : expired ? 'Expired' : 'Active';
  return (
    <span className={cn('text-small font-medium', voided || expired ? 'text-alert' : 'text-leaf')}>
      {label}
    </span>
  );
}

const columns = [
  { key: 'serial', header: 'Serial number', render: (r) => <span className="font-mono text-small">{r.serialUnit?.serialNumber}</span> },
  { key: 'product', header: 'Product', render: (r) => r.serialUnit?.product?.name ?? '—' },
  { key: 'customer', header: 'Customer', render: (r) => r.serialUnit?.project?.customer?.name ?? '—' },
  { key: 'startDate', header: 'Start', render: (r) => r.startDate ? formatDate(r.startDate) : '—' },
  { key: 'endDate', header: 'End', render: (r) => r.endDate ? formatDate(r.endDate) : '—' },
  { key: 'status', header: 'Status', render: (r) => <WarrantyStatus row={r} /> },
  { key: 'voidReason', header: 'Void reason', render: (r) => r.voidReason ?? <span className="text-muted">—</span> },
];

export function WarrantiesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, isError, error, refetch } = useWarranties({
    search: search || undefined,
    status: status || undefined,
    pageSize: 50,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Support' }, { label: 'Warranties' }]}
        title="Warranties"
        subtitle="One warranty row per delivered serialized unit (BR-09). Start date = delivery date."
      />

      <div className="flex gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search serial number" className="w-64" />
        <select
          className="border border-line rounded-md px-3 py-2 text-body bg-white text-ink"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        rows.length === 0 ? <EmptyState title="No warranties" description="Warranties are created automatically when a dispatch is marked delivered." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
