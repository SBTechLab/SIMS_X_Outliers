import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, DataTable, StatusBadge, SearchInput, FilterBar,
  Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { formatDate, formatCapacity } from '@/lib/format.js';
import { useProjects } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'AWAITING_ADVANCE', label: 'Awaiting advance' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'INSTALLATION_SCHEDULED', label: 'Install scheduled' },
  { value: 'INSTALLING', label: 'Installing' },
  { value: 'INSTALLED', label: 'Installed' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const columns = [
  { key: 'code', header: 'Project', render: (row) => <span className="font-mono text-small">{row.code}</span> },
  { key: 'customer', header: 'Customer', render: (row) => <div><div className="font-medium">{row.customer?.name}</div><div className="text-small text-muted">{row.customer?.phone}</div></div> },
  { key: 'capacity', header: 'System', render: (row) => <div><div>{formatCapacity(row.capacityKw)}</div><div className="text-small text-muted">{row.systemType?.replace('_', '-')}</div></div> },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge enumName="ProjectStatus" value={row.status} /> },
  { key: 'siteAddress', header: 'Site', render: (row) => <span className="text-small">{row.siteAddress}</span> },
  { key: 'confirmedAt', header: 'Confirmed', render: (row) => formatDate(row.confirmedAt) },
  { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
];

export function ProjectsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = { status: status || undefined, q: search || undefined, page, pageSize: 20 };
  const { data, isLoading, isError, error, refetch } = useProjects(params);

  const filters = [
    { type: 'select', id: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const projects = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Sales' }, { label: 'Projects' }]}
        title="Projects"
        subtitle="Confirm when the advance is received; the warehouse picks up immediately."
      />
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search project code, customer…" className="max-w-xs" />
      </div>
      <FilterBar filters={filters} />
      {projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Projects are created automatically when a quote is accepted." />
      ) : (
        <DataTable
          columns={columns}
          rows={projects}
          onRowClick={(row) => navigate(`/sales/projects/${row.id}`)}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}
    </div>
  );
}
