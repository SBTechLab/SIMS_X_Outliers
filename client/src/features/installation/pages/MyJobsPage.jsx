import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, Button, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useMyInstallations, useStartInstallation } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function MyJobsPage() {
  const [status, setStatus] = useState('');
  const { data, isLoading, isError, error, refetch } = useMyInstallations({
    status: status || undefined,
    pageSize: 50,
  });
  const startInstallation = useStartInstallation();
  const rows = Array.isArray(data) ? data : [];

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
    { key: 'city', header: 'Site', render: (r) => r.project?.customer?.city ?? '—' },
    {
      key: 'actions', header: '',
      render: (r) => {
        if (r.status === 'SCHEDULED') {
          return (
            <Button
              size="sm"
              onClick={() => startInstallation.mutate(r.id)}
              loading={startInstallation.isPending}
            >
              Start
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'My jobs' }]}
        title="My installation jobs"
        subtitle="Jobs assigned to your crew. Use the Warehouse app to record completion photos, checklist, and customer signature (BR-10)."
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
        rows.length === 0 ? <EmptyState title="No jobs assigned" description="Installation jobs assigned to you will appear here." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
