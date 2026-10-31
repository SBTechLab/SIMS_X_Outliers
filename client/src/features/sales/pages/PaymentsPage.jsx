import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import {
  PageHeader, DataTable, Button, StatusBadge, Modal, Input, Select,
  DateInput, Skeleton, EmptyState, ErrorState,
} from '@/components/ui';
import { formatDate, formatINR } from '@/lib/format.js';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../api.js';
import { useRecordPayment } from '../hooks.js';
import { SALES_KEYS } from '../hooks.js';

const paymentSchema = z.object({
  projectId: z.string().cuid().optional().or(z.literal('')),
  customerId: z.string().cuid('Select a customer'),
  amount: z.coerce.number().positive('Must be positive'),
  type: z.enum(['ADVANCE', 'PARTIAL', 'FINAL', 'SERVICE']),
  mode: z.enum(['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD']),
  reference: z.string().optional(),
  receivedAt: z.string().min(1, 'Required'),
});

const columns = [
  { key: 'project', header: 'Project', render: (row) => row.project?.code ?? '—' },
  { key: 'customer', header: 'Customer', render: (row) => row.customer?.name ?? '—' },
  { key: 'amount', header: 'Amount', render: (row) => formatINR(row.amount) },
  { key: 'type', header: 'Type', render: (row) => <StatusBadge enumName="PaymentType" value={row.type} /> },
  { key: 'mode', header: 'Mode', render: (row) => <StatusBadge enumName="PaymentMode" value={row.mode} /> },
  { key: 'reference', header: 'Reference', render: (row) => row.reference ?? '—' },
  { key: 'receivedAt', header: 'Received on', render: (row) => formatDate(row.receivedAt) },
];

export function PaymentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...SALES_KEYS.payments, { page }],
    queryFn: () => salesApi.getPayments({ page, pageSize: 20 }),
  });

  const { data: customersData } = useQuery({
    queryKey: SALES_KEYS.customers,
    queryFn: () => salesApi.getCustomers({ pageSize: 200 }),
  });

  const recordPayment = useRecordPayment();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { type: 'ADVANCE', mode: 'UPI' },
  });

  function onSubmit(values) {
    recordPayment.mutate(
      { ...values, customerId: values.customerId, projectId: values.projectId || undefined },
      { onSuccess: () => { setModalOpen(false); reset(); } },
    );
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const payments = Array.isArray(data) ? data : [];
  const meta = data?.meta;
  const customers = Array.isArray(customersData) ? customersData : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Sales' }, { label: 'Payments' }]}
        title="Payments"
        subtitle="Money is recorded, not processed. Advance payments unlock project confirmation."
        actions={
          <Button onClick={() => setModalOpen(true)} icon={Plus}>Record payment</Button>
        }
      />

      {payments.length === 0 ? (
        <EmptyState title="No payments yet" description="Record a payment when a customer pays their advance or balance." />
      ) : (
        <DataTable
          columns={columns}
          rows={payments}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record payment">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Select label="Customer" error={errors.customerId?.message} {...register('customerId')}>
            <option value="">Select customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
          </Select>
          <Input label="Amount (₹)" type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
          <Select label="Type" error={errors.type?.message} {...register('type')}>
            <option value="ADVANCE">Advance</option>
            <option value="PARTIAL">Partial</option>
            <option value="FINAL">Final</option>
            <option value="SERVICE">Service</option>
          </Select>
          <Select label="Mode" error={errors.mode?.message} {...register('mode')}>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CARD">Card</option>
          </Select>
          <Input label="Reference" placeholder="UTR / cheque no." error={errors.reference?.message} {...register('reference')} />
          <Input label="Received on" type="date" error={errors.receivedAt?.message} {...register('receivedAt')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={recordPayment.isPending}>Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
