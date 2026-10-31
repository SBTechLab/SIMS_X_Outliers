import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, SearchInput, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatINR } from '@/lib/format.js';
import { useProducts } from '../hooks.js';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'PANEL', label: 'Panel' },
  { value: 'INVERTER', label: 'Inverter' },
  { value: 'BATTERY', label: 'Battery' },
  { value: 'CHARGE_CONTROLLER', label: 'Charge controller' },
  { value: 'MOUNTING_STRUCTURE', label: 'Mounting structure' },
  { value: 'DC_BOX', label: 'DC box' },
  { value: 'AC_BOX', label: 'AC box' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'EARTHING', label: 'Earthing' },
  { value: 'CONNECTOR', label: 'Connector' },
  { value: 'ACCESSORY', label: 'Accessory' },
  { value: 'SERVICE', label: 'Service' },
];

const columns = [
  { key: 'sku', header: 'SKU', render: (r) => <span className="font-mono text-small">{r.sku}</span> },
  {
    key: 'name', header: 'Product',
    render: (r) => (
      <div>
        <div className="font-medium">{r.name}</div>
        <div className="text-small text-muted">{r.brand ?? ''}</div>
      </div>
    ),
  },
  { key: 'category', header: 'Category', render: (r) => <StatusBadge enumName="ProductCategory" value={r.category} /> },
  { key: 'serialized', header: 'Serialized', render: (r) => r.isSerialized ? 'Yes' : 'No' },
  {
    key: 'stock', header: 'Stock',
    render: (r) => (
      <span className={r.stockQty <= r.reorderLevel && !r.isSerialized ? 'text-alert font-medium' : ''}>
        {r.isSerialized ? '— (by serial)' : `${r.stockQty} ${r.unit.toLowerCase()}`}
      </span>
    ),
  },
  { key: 'costPrice', header: 'Cost', render: (r) => formatINR(r.costPrice) },
  { key: 'sellPrice', header: 'Sell', render: (r) => formatINR(r.sellPrice) },
];

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useProducts({
    search: search || undefined,
    category: category || undefined,
    isActive: true,
    page,
    pageSize: 20,
  });

  const rows = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ to: '/warehouse', label: 'Warehouse' }, { label: 'Products' }]}
        title="Products"
        subtitle="Solar equipment catalogue with pricing and stock levels."
      />

      <div className="flex gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or SKU" className="w-64" />
        <select
          className="border border-line rounded-md px-3 py-2 text-body bg-white text-ink"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        rows.length === 0 ? <EmptyState title="No products" description="No products match the selected filters." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
