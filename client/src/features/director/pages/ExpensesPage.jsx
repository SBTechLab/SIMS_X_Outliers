import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PageHeader, DataTable, StatusBadge, FilterBar, Button,
  Skeleton, EmptyState, ErrorState, Modal, Input, Select, Textarea,
} from '@/components/ui';
import { formatINR, formatDate } from '@/lib/format.js';
import { useExpenses, useCreateExpense } from '../hooks.js';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'LABOUR_EXTRA', label: 'Extra labour' },
  { value: 'CIVIL_WORK', label: 'Civil work' },
  { value: 'MISC', label: 'Misc' },
];

const CATEGORY_CREATE_OPTIONS = CATEGORY_OPTIONS.slice(1).map((o) => ({ value: o.value, label: o.label }));

const schema = z.object({
  category: z.enum(['TRANSPORT', 'LABOUR_EXTRA', 'CIVIL_WORK', 'MISC']),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().min(2),
  spentAt: z.string().min(1, 'Date required'),
  projectId: z.string().optional(),
});

const columns = [
  {
    key: 'category',
    header: 'Category',
    render: (row) => <StatusBadge enumName="ExpenseCategory" value={row.category} />,
  },
  {
    key: 'description',
    header: 'Description',
    render: (row) => <span className="text-small">{row.description}</span>,
  },
  {
    key: 'project',
    header: 'Project',
    render: (row) => row.project ? <span className="font-mono text-small">{row.project.code}</span> : <span className="text-muted">—</span>,
  },
  {
    key: 'amount',
    header: 'Amount',
    render: (row) => <span className="tabular-nums font-medium">{formatINR(row.amount)}</span>,
  },
  {
    key: 'spentAt',
    header: 'Date',
    render: (row) => <span className="text-small text-muted">{formatDate(row.spentAt)}</span>,
  },
  {
    key: 'createdBy',
    header: 'Recorded by',
    render: (row) => <span className="text-small text-muted">{row.createdBy?.name}</span>,
  },
];

export function ExpensesPage() {
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isError, error, refetch } = useExpenses({ category: category || undefined, page });
  const createExpense = useCreateExpense();
  const rows = Array.isArray(data) ? data : [];
  const meta = data?.meta;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { category: 'MISC', spentAt: new Date().toISOString().slice(0, 16) },
  });

  function onSubmit(values) {
    const data = { ...values, spentAt: new Date(values.spentAt).toISOString() };
    createExpense.mutate(data, {
      onSuccess: () => { reset(); setShowAdd(false); },
    });
  }

  const filters = [
    { type: 'select', id: 'category', label: 'Category', value: category, onChange: setCategory, options: CATEGORY_OPTIONS },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ label: 'Director' }, { label: 'Expenses' }]} title="Expenses" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Director' }, { label: 'Finance' }]}
        title="Expenses"
        subtitle="Project and ticket expenses that feed into the profitability calculation (BR-13)."
        actions={<Button variant="primary" size="sm" leading={Plus} onClick={() => setShowAdd(true)}>Add expense</Button>}
      />

      <FilterBar filters={filters} />

      {rows.length === 0 ? (
        <EmptyState title="No expenses" description={category ? 'Try adjusting filters.' : 'Record transport, civil work and other project costs here.'} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          pagination={meta ? { page: meta.page, pageSize: meta.pageSize, total: meta.total, onChange: setPage } : undefined}
        />
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record expense">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Select label="Category" {...register('category')} error={errors.category?.message} options={CATEGORY_CREATE_OPTIONS} />
          <Input label="Amount (INR)" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
          <Textarea label="Description" {...register('description')} error={errors.description?.message} rows={2} />
          <Input label="Date" type="datetime-local" {...register('spentAt')} error={errors.spentAt?.message} />
          <Input label="Project ID (optional)" placeholder="prj_..." {...register('projectId')} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={createExpense.isPending}>Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
