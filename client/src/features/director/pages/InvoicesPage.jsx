import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, DataTable, StatusBadge, SearchInput, FilterBar,
  Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { formatINR, formatDate } from '@/lib/format.js';
import { useInvoices } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'PROFORMA', label: 'Proforma' },
  { value: 'TAX', label: 'Tax' },
  { value: 'SERVICE', label: 'Service' },
];

const columns = [
  {
    key: 'number',
    header: 'Invoice',
    render: (row) => <span className="font-mono text-small font-medium">{row.number}</span>,
  },
  {
    key: 'customer',
    header: 'Customer',
    render: (row) => (
      <div>
        <div className="font-medium">{row.customer?.name}</div>
        {row.project && <div className="text-small text-muted">{row.project.code}</div>}
      </div>
    ),
  },
  { key: 'type', header: 'Type', render: (row) => <StatusBadge enumName="InvoiceType" value={row.type} /> },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge enumName="InvoiceStatus" value={row.status} /> },
  {
    key: 'total',
    header: 'Total',
    render: (row) => <span className="tabular-nums font-medium">{formatINR(row.total)}</span>,
  },
  {
    key: 'amountPaid',
    header: 'Paid',
    render: (row) => <span className="tabular-nums text-muted">{formatINR(row.amountPaid)}</span>,
  },
  {
    key: 'issueDate',
    header: 'Issued',
    render: (row) => <span className="text-small text-muted">{formatDate(row.issueDate)}</span>,
  },
];

export function InvoicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const params = {
    q: search || undefined,
    status: status || undefined,
    type: type || undefined,
    page,
    pageSize: 20,
  };

  const { data, isLoading, isError, error, refetch } = useInvoices(params);
  const rows = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  const filters = [
    { type: 'select', id: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
    { type: 'select', id: 'type', label: 'Type', value: type, onChange: setType, options: TYPE_OPTIONS },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Director' }, { label: 'Invoices' }]} title="Invoices" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Director' }, { label: 'Finance' }]}
        title="Invoices"
        subtitle="Proforma, tax, and service invoices. Status syncs automatically with payments."
      />

      <div className="flex flex-col gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search number, customer…" className="max-w-xs" />
        <FilterBar filters={filters} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No invoices" description={search || status ? 'Try adjusting filters.' : 'Invoices are created automatically when a project is confirmed or installed.'} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(row) => navigate(`/director/invoices/${row.id}`)}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}
    </div>
  );
}
