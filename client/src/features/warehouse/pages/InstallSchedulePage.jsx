import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useInstallations } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'UNSCHEDULED', label: 'Unscheduled' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

const columns = [
  {
    key: 'project', header: 'Project',
    render: (r) => (
      <div>
        <div className="font-mono font-medium text-small">{r.project?.code}</div>
        <div className="text-small text-muted">{r.project?.customer?.name}</div>
      </div>
    ),
  },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge enumName="InstallationStatus" value={r.status} /> },
  { key: 'scheduledDate', header: 'Scheduled', render: (r) => r.scheduledDate ? formatDate(r.scheduledDate) : '—' },
  { key: 'capacity', header: 'Capacity', render: (r) => r.project?.capacityKw ? `${r.project.capacityKw} kW` : '—' },
  {
    key: 'crew', header: 'Crew',
    render: (r) => {
      const lead = (r.crew ?? []).find(c => c.isLead);
      return lead?.technician?.name ?? <span className="text-muted">—</span>;
    },
  },
  { key: 'location', header: 'Site', render: (r) => r.project?.customer?.city ?? '—' },
];

export function InstallSchedulePage() {
  const [status, setStatus] = useState('');
  const { data, isLoading, isError, error, refetch } = useInstallations({ status: status || undefined, pageSize: 50 });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ to: '/warehouse', label: 'Warehouse' }, { label: 'Install schedule' }]}
        title="Installation schedule"
        subtitle="Pick a date and crew for every delivered project. Scheduling triggers notification to the assigned technicians."
      />

      <div className="flex gap-2">
        <select
          className="border border-line rounded-md px-3 py-2 text-body bg-white text-ink"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        rows.length === 0 ? <EmptyState title="No installation jobs" description="Installation jobs are created when a project is confirmed." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
