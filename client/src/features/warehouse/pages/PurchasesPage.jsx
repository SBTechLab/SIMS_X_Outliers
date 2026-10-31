import { useState } from 'react';
import { PageHeader, DataTable, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatINR, formatDate } from '@/lib/format.js';
import { usePurchases } from '../hooks.js';

const columns = [
  { key: 'number', header: 'Number', render: (r) => <span className="font-mono text-small">{r.number}</span> },
  { key: 'supplier', header: 'Supplier', render: (r) => r.supplier?.name ?? '—' },
  { key: 'items', header: 'Items', render: (r) => r._count?.items ?? 0 },
  { key: 'total', header: 'Total', render: (r) => formatINR(r.total) },
  { key: 'purchasedAt', header: 'Date', render: (r) => formatDate(r.purchasedAt) },
  { key: 'createdBy', header: 'Recorded by', render: (r) => r.createdBy?.name ?? '—' },
];

export function PurchasesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = usePurchases({ page, pageSize: 20 });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ to: '/warehouse', label: 'Warehouse' }, { label: 'Purchases' }]}
        title="Purchases"
        subtitle="Goods receipts and the serial numbers they register."
      />

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        rows.length === 0 ? <EmptyState title="No purchases" description="Purchase records will appear here." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
