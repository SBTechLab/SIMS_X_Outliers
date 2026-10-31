import { Link } from 'react-router-dom';
import { FileText, Briefcase, Receipt } from 'lucide-react';
import { Card, Skeleton, ErrorState, StatCard } from '@/components/ui';
import { usePortalOverview } from '../hooks.js';

export function PortalOverviewPage() {
  const { data, isLoading, isError, error, refetch } = usePortalOverview();

  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    </div>
  );

  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const customer = data?.customer;
  const counts = customer?._count ?? {};

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <div className="font-medium text-base">{customer?.name}</div>
        <div className="text-small text-muted">{customer?.phone}</div>
        {customer?.city && <div className="text-small text-muted">{customer.city}</div>}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/portal/projects">
          <StatCard icon={Briefcase} label="Projects" value={counts.projects ?? 0} />
        </Link>
        <Link to="/portal/quotes">
          <StatCard icon={FileText} label="Quotes" value={counts.quotes ?? 0} />
        </Link>
        <Link to="/portal/invoices">
          <StatCard icon={Receipt} label="Invoices" value={counts.invoices ?? 0} />
        </Link>
      </div>
    </div>
  );
}
