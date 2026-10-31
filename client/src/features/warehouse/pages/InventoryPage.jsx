import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader, DataTable, SearchInput, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { cn } from '@/lib/cn.js';
import { useInventory } from '../hooks.js';

const columns = [
  { key: 'sku', header: 'SKU', render: (r) => <span className="font-mono text-small">{r.sku}</span> },
  { key: 'name', header: 'Product', render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'category', header: 'Category', render: (r) => r.category.replace(/_/g, ' ') },
  {
    key: 'stock', header: 'In stock',
    render: (r) => (
      <div className="flex items-center gap-1.5">
        <span className={cn('tabular-nums font-medium', r.isBelowReorder && 'text-alert')}>
          {r.availableQty}
        </span>
        <span className="text-small text-muted">{r.unit.toLowerCase()}</span>
        {r.isBelowReorder && <AlertTriangle size={14} className="text-alert" />}
      </div>
    ),
  },
  {
    key: 'reorder', header: 'Reorder at',
    render: (r) => <span className="text-muted">{r.reorderLevel} {r.unit.toLowerCase()}</span>,
  },
  {
    key: 'type', header: 'Type',
    render: (r) => <span className="text-small">{r.isSerialized ? 'Serialized' : 'Bulk'}</span>,
  },
];

export function InventoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useInventory({ search: search || undefined, page, pageSize: 30 });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ to: '/warehouse', label: 'Warehouse' }, { label: 'Inventory' }]}
        title="Inventory"
        subtitle="Stock levels for all active products. Items below reorder level are highlighted."
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search products" className="w-64" />

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        rows.length === 0 ? <EmptyState title="No inventory data" description="No products found." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
