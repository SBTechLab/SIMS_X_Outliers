import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, DataTable, StatusBadge, SearchInput,
  Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { formatDate, formatPhone } from '@/lib/format.js';
import { useCustomers } from '../hooks.js';

const columns = [
  { key: 'name', header: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
  { key: 'phone', header: 'Phone', render: (row) => formatPhone(row.phone) },
  { key: 'city', header: 'City', render: (row) => row.city ?? '—' },
  { key: 'type', header: 'Type', render: (row) => <StatusBadge enumName="CustomerType" value={row.customerType} /> },
  { key: 'projects', header: 'Projects', render: (row) => row._count?.projects ?? 0 },
  { key: 'quotes', header: 'Quotes', render: (row) => row._count?.quotes ?? 0 },
  { key: 'createdAt', header: 'Since', render: (row) => formatDate(row.createdAt) },
];

export function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = { q: search || undefined, page, pageSize: 20 };
  const { data, isLoading, isError, error, refetch } = useCustomers(params);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const customers = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Sales' }, { label: 'Customers' }]}
        title="Customers"
        subtitle="Customer accounts created when a quote is first sent."
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, email…" className="max-w-xs" />
      {customers.length === 0 ? (
        <EmptyState title="No customers yet" description="A customer account is created when you send a quote." />
      ) : (
        <DataTable
          columns={columns}
          rows={customers}
          onRowClick={(row) => navigate(`/sales/customers/${row.id}`)}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}
    </div>
  );
}
