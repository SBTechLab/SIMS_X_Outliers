import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  PageHeader, DataTable, StatusBadge, FilterBar, Button,
  Skeleton, EmptyState, ErrorState, ConfirmDialog,
} from '@/components/ui';
import { formatINR, formatDate, formatDuration } from '@/lib/format.js';
import { usePayouts, useGeneratePayouts, useApprovePayout, useMarkPayoutPaid } from '../hooks.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
];

const columns = [
  {
    key: 'technician',
    header: 'Technician',
    render: (row) => (
      <div>
        <div className="font-medium">{row.technician?.name}</div>
        <div className="text-small text-muted">{row.technician?.role?.replace('_', ' ')}</div>
      </div>
    ),
  },
  {
    key: 'period',
    header: 'Period',
    render: (row) => (
      <span className="text-small">
        {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
      </span>
    ),
  },
  {
    key: 'totalMinutes',
    header: 'Hours',
    render: (row) => <span className="tabular-nums">{(row.totalMinutes / 60).toFixed(1)}h</span>,
  },
  {
    key: 'hourlyRate',
    header: 'Rate',
    render: (row) => <span className="tabular-nums text-muted">{formatINR(row.hourlyRate)}/hr</span>,
  },
  {
    key: 'amount',
    header: 'Amount',
    render: (row) => <span className="tabular-nums font-medium">{formatINR(row.amount)}</span>,
  },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge enumName="PayoutStatus" value={row.status} /> },
];

export function PayoutsPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [status, setStatus] = useState('');
  const [confirmGenerate, setConfirmGenerate] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePayouts({ month: month || undefined, status: status || undefined });
  const generatePayouts = useGeneratePayouts();
  const approvePayout = useApprovePayout();
  const markPaid = useMarkPayoutPaid();

  const rows = data?.data ?? [];

  const filters = [
    { type: 'select', id: 'status', label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Director' }, { label: 'Payouts' }]} title="Technician payouts" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Director' }, { label: 'Finance' }]}
        title="Technician payouts"
        subtitle="Generated from approved time logs. Generating is idempotent — re-running updates existing draft rows."
        actions={
          <Button variant="primary" size="sm" leading={RefreshCw} onClick={() => setConfirmGenerate(true)}>
            Generate for {month}
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <label className="text-small text-muted mb-1">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-line px-3 py-1.5 text-body focus:ring-2 focus:ring-sun focus:outline-none"
          />
        </div>
        <FilterBar filters={filters} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No payouts for this period"
          description="Generate payouts from approved time logs to see them here."
        />
      ) : (
        <DataTable
          columns={[
            ...columns,
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex gap-2">
                  {row.status === 'DRAFT' && (
                    <Button size="sm" variant="outline" onClick={() => approvePayout.mutate(row.id)}>
                      Approve
                    </Button>
                  )}
                  {row.status === 'APPROVED' && (
                    <Button size="sm" variant="primary" onClick={() => markPaid.mutate({ id: row.id, data: {} })}>
                      Mark paid
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={rows}
        />
      )}

      <ConfirmDialog
        open={confirmGenerate}
        onClose={() => setConfirmGenerate(false)}
        title={`Generate payouts for ${month}`}
        description="This will create or update draft payout rows for all active technicians based on their approved time logs for this period."
        confirmLabel="Generate"
        onConfirm={() => {
          generatePayouts.mutate({ month });
          setConfirmGenerate(false);
        }}
      />
    </div>
  );
}
