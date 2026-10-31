import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, DataTable, StatusBadge, SearchInput, FilterBar,
  Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useSurveys } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const columns = [
  { key: 'lead', header: 'Lead', render: (row) => <span className="font-mono text-small">{row.lead?.code ?? '—'}</span> },
  { key: 'leadName', header: 'Customer', render: (row) => row.lead?.name ?? '—' },
  { key: 'city', header: 'City', render: (row) => row.lead?.city ?? '—' },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge enumName="SurveyStatus" value={row.status} /> },
  { key: 'technician', header: 'Technician', render: (row) => row.technician?.name ?? '—' },
  { key: 'scheduledAt', header: 'Scheduled', render: (row) => formatDate(row.scheduledAt) },
  { key: 'submittedAt', header: 'Submitted', render: (row) => formatDate(row.submittedAt) },
];

export function SurveysPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = { status: status || undefined, page, pageSize: 20 };
  const { data, isLoading, isError, error, refetch } = useSurveys(params);

  const filters = [
    { type: 'select', id: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const surveys = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Sales' }, { label: 'Surveys' }]}
        title="Surveys"
        subtitle="Approve or reject submitted reports before any quote goes out."
      />
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="max-w-xs" />
      </div>
      <FilterBar filters={filters} />
      {surveys.length === 0 ? (
        <EmptyState title="No surveys found" description="Surveys are created after a lead is qualified." />
      ) : (
        <DataTable
          columns={columns}
          rows={surveys}
          onRowClick={(row) => navigate(`/sales/surveys/${row.id}`)}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}
    </div>
  );
}
