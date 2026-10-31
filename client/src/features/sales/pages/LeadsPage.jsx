import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle } from 'lucide-react';
import {
  PageHeader, DataTable, Button, StatusBadge, SearchInput, FilterBar,
  Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { formatDate, timeAgo, formatPhone } from '@/lib/format.js';
import { useLeads } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'SURVEY_SCHEDULED', label: 'Survey scheduled' },
  { value: 'SURVEY_DONE', label: 'Survey done' },
  { value: 'SURVEY_APPROVED', label: 'Survey approved' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'CAMPAIGN', label: 'Campaign' },
  { value: 'DIRECT', label: 'Direct' },
];

const columns = [
  {
    key: 'code',
    header: 'Code',
    render: (row) => <span className="font-mono text-small">{row.code}</span>,
  },
  {
    key: 'name',
    header: 'Name',
    render: (row) => (
      <div>
        <div className="font-medium">{row.name}</div>
        <div className="text-small text-muted">{formatPhone(row.phone)}</div>
      </div>
    ),
  },
  {
    key: 'city',
    header: 'City',
    render: (row) => row.city ?? '—',
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <div className="flex items-center gap-1.5">
        <StatusBadge enumName="LeadStatus" value={row.status} />
        {row.isOverdue && (
          <AlertCircle size={14} className="text-danger" title="Overdue — no contact in 24h" />
        )}
      </div>
    ),
  },
  {
    key: 'source',
    header: 'Source',
    render: (row) => <StatusBadge enumName="LeadSource" value={row.source} />,
  },
  {
    key: 'assignedTo',
    header: 'Assigned to',
    render: (row) => row.assignedTo?.name ?? <span className="text-muted">Unassigned</span>,
  },
  {
    key: 'createdAt',
    header: 'Received',
    render: (row) => (
      <span title={formatDate(row.createdAt)} className="text-small text-muted">{timeAgo(row.createdAt)}</span>
    ),
  },
];

export function LeadsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  const params = {
    q: search || undefined,
    status: status || undefined,
    source: source || undefined,
    overdue: overdueOnly || undefined,
    page,
    pageSize: 20,
  };

  const { data, isLoading, isError, error, refetch } = useLeads(params);

  const filters = [
    { type: 'select', id: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
    { type: 'select', id: 'source', label: 'Source', value: source, onChange: setSource, options: SOURCE_OPTIONS },
    { type: 'toggle', id: 'overdue', label: 'Overdue only', value: overdueOnly, onChange: setOverdueOnly },
  ];

  if (isLoading) return <PageSkeleton />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Sales' }, { label: 'Leads' }]} title="Lead board" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  const leads = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Sales' }, { label: 'Leads' }]}
        title="Lead board"
        subtitle="Every enquiry, kept permanently. Overdue leads flagged after 24h without contact."
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, city…" className="max-w-xs" />
        </div>
        <FilterBar filters={filters} />
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={search || status || source ? 'Try adjusting the filters.' : 'Leads will appear here when customers submit enquiries.'}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={leads}
          onRowClick={(row) => navigate(`/sales/leads/${row.id}`)}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
