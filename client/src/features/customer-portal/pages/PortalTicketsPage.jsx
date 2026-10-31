import { useState } from 'react';
import { PageHeader, Card, DataTable, Button, StatusBadge, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useMyTickets, useCreateTicket, useConfirmTicket } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

function NewTicketForm({ onClose }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const createTicket = useCreateTicket();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim()) return;
    createTicket.mutate({ subject: subject.trim(), description: description.trim() }, { onSuccess: onClose });
  };

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-ink mb-4">Raise a service request</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-small text-muted block mb-1">Subject</label>
          <input
            className="border border-line rounded-md px-3 py-2 text-body w-full"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Briefly describe the issue"
            required
          />
        </div>
        <div>
          <label className="text-small text-muted block mb-1">Description</label>
          <textarea
            className="border border-line rounded-md px-3 py-2 text-body w-full resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details (optional)"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" loading={createTicket.isPending}>Submit</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

export function PortalTicketsPage() {
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const confirmTicket = useConfirmTicket();

  const { data, isLoading, isError, error, refetch } = useMyTickets({
    status: status || undefined,
    pageSize: 50,
  });
  const rows = Array.isArray(data) ? data : [];

  const columns = [
    { key: 'code', header: 'Ticket', render: (r) => <span className="font-mono text-small">{r.code}</span> },
    { key: 'subject', header: 'Subject', render: (r) => <span className="font-medium">{r.subject}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge enumName="TicketStatus" value={r.status} /> },
    { key: 'createdAt', header: 'Raised', render: (r) => formatDate(r.createdAt) },
    {
      key: 'actions', header: '',
      render: (r) => {
        if (r.status === 'RESOLVED') {
          return (
            <Button
              size="sm"
              onClick={() => confirmTicket.mutate({ id: r.id, confirmationNote: 'Confirmed by customer.' })}
              loading={confirmTicket.isPending}
            >
              Confirm resolved
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
        breadcrumb={[{ to: '/portal', label: 'My account' }, { label: 'Service requests' }]}
        title="Service requests"
        subtitle="Raise a new request or confirm that a resolved issue has been fixed (BR-12)."
        action={!showForm && <Button onClick={() => setShowForm(true)}>Raise request</Button>}
      />

      {showForm && <NewTicketForm onClose={() => setShowForm(false)} />}

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
        rows.length === 0 ? <EmptyState title="No service requests" description="You have not raised any service requests yet." /> :
        <DataTable columns={columns} rows={rows} />
      }
    </div>
  );
}
