import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, SearchInput, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useTickets } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const columns = [
  { key: 'code', header: 'Ticket', render: (r) => <span className="font-mono text-small">{r.code}</span> },
  { key: 'subject', header: 'Subject', render: (r) => <span className="font-medium">{r.subject}</span> },
  { key: 'customer', header: 'Customer', render: (r) => r.project?.customer?.name ?? '—' },
  { key: 'priority', header: 'Priority', render: (r) => <StatusBadge enumName="TicketPriority" value={r.priority} /> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge enumName="TicketStatus" value={r.status} /> },
  { key: 'warranty', header: 'Warranty', render: (r) => r.isUnderWarranty ? <span className="text-leaf text-small">Yes</span> : <span className="text-muted text-small">No</span> },
  { key: 'assignee', header: 'Assigned to', render: (r) => r.assignedTo?.name ?? <span className="text-muted">—</span> },
  { key: 'createdAt', header: 'Raised', render: (r) => formatDate(r.createdAt) },
];

export function TicketsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const { data, isLoading, isError, error, refetch } = useTickets({
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
    pageSize: 50,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Support' }, { label: 'Tickets' }]}
        title="Service tickets"
        subtitle="BR-11: warranty status is frozen at creation time. BR-12: ticket closes only after customer confirms resolution."
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
        <select
          className="border border-line rounded-md px-3 py-2 text-body bg-white text-ink"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        rows.length === 0 ? <EmptyState title="No tickets" description="Service tickets raised by customers or the support team will appear here." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
