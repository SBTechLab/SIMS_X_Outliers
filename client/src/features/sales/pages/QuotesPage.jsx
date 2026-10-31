import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, DataTable, StatusBadge, SearchInput, FilterBar,
  Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { formatDate, formatINR, formatCapacity } from '@/lib/format.js';
import { useQuotes } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
];

const columns = [
  { key: 'number', header: 'Quote', render: (row) => <span className="font-mono text-small">{row.number}</span> },
  { key: 'customer', header: 'Customer', render: (row) => row.customer?.name ?? '—' },
  {
    key: 'capacity',
    header: 'Capacity',
    render: (row) => (
      <div>
        <div>{formatCapacity(row.capacityKw)}</div>
        <div className="text-small text-muted">{row.systemType?.replace('_', '-') ?? '—'}</div>
      </div>
    ),
  },
  { key: 'total', header: 'Total', render: (row) => formatINR(row.total) },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge enumName="QuoteStatus" value={row.status} /> },
  { key: 'validUntil', header: 'Valid until', render: (row) => formatDate(row.validUntil) },
  { key: 'sentAt', header: 'Sent', render: (row) => formatDate(row.sentAt) },
];

export function QuotesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = { status: status || undefined, q: search || undefined, page, pageSize: 20 };
  const { data, isLoading, isError, error, refetch } = useQuotes(params);

  const filters = [
    { type: 'select', id: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const quotes = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Sales' }, { label: 'Quotes' }]}
        title="Quotes"
        subtitle="Built from kit templates — the parts list expands at creation time."
      />
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search quote number, customer…" className="max-w-xs" />
      </div>
      <FilterBar filters={filters} />
      {quotes.length === 0 ? (
        <EmptyState title="No quotes found" description="Quotes are created from a lead with an approved survey." />
      ) : (
        <DataTable
          columns={columns}
          rows={quotes}
          onRowClick={(row) => navigate(`/sales/quotes/${row.id}`)}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}
    </div>
  );
}
