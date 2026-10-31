import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, SearchInput, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useMyTickets } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const columns = [
  { key: 'code', header: 'Ticket', render: (r) => <span className="font-mono text-small">{r.code}</span> },
  { key: 'subject', header: 'Subject', render: (r) => <span className="font-medium">{r.subject}</span> },
  { key: 'customer', header: 'Customer', render: (r) => r.project?.customer?.name ?? '—' },
  { key: 'priority', header: 'Priority', render: (r) => <StatusBadge enumName="TicketPriority" value={r.priority} /> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge enumName="TicketStatus" value={r.status} /> },
  { key: 'warranty', header: 'Warranty', render: (r) => r.isUnderWarranty ? <span className="text-leaf text-small">Yes</span> : <span className="text-muted text-small">No</span> },
  { key: 'createdAt', header: 'Raised', render: (r) => formatDate(r.createdAt) },
];

export function MyTicketsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, isError, error, refetch } = useMyTickets({
    assignedToMe: true,
    search: search || undefined,
    status: status || undefined,
    pageSize: 50,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'My tickets' }]}
        title="My service tickets"
        subtitle="Tickets assigned to you for field service. Log activities and parts used. BR-11: warranty status was frozen at ticket creation."
      />

      <div className="flex gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search subject, code" className="w-64" />
        <select
          className="border border-line rounded-md px-3 py-2 text-body bg-white text-ink"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        rows.length === 0 ? <EmptyState title="No tickets assigned" description="Service tickets assigned to you will appear here." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
