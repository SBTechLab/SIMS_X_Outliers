import { Card, StatusBadge, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate, formatINR } from '@/lib/format.js';
import { useMyInvoices } from '../hooks.js';

export function PortalInvoicesPage() {
  const { data, isLoading, isError, error, refetch } = useMyInvoices();

  if (isLoading) return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-card" />)}
    </div>
  );

  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];

  if (invoices.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No invoices" description="Invoices will appear here after your project is confirmed." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {invoices.map((inv) => (
        <Card key={inv.id}>
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-small text-muted">{inv.number}</span>
              <div className="font-medium mt-0.5">{formatINR(inv.total)}</div>
              {inv.project && <div className="text-small text-muted">Project {inv.project.code}</div>}
            </div>
            <StatusBadge enumName="InvoiceStatus" value={inv.status} />
          </div>
          <div className="text-small text-muted mt-2">
            Issued {formatDate(inv.issueDate)}
            {inv.dueDate && ` · Due ${formatDate(inv.dueDate)}`}
          </div>
          <div className="text-small text-muted">
            Paid: {formatINR(inv.amountPaid)}
          </div>
        </Card>
      ))}
    </div>
  );
}
