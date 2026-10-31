import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, Card, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatINR } from '@/lib/format.js';
import { useProjectProfit } from '../hooks.js';
import { cn } from '@/lib/cn.js';

function CostRow({ label, amount, highlight }) {
  return (
    <div className={cn('flex items-center justify-between py-2', highlight && 'border-t border-line mt-1 pt-3')}>
      <span className={cn('text-body', highlight ? 'font-semibold text-ink' : 'text-muted')}>{label}</span>
      <span className={cn('tabular-nums', highlight ? 'font-semibold text-ink' : 'text-ink')}>{formatINR(amount ?? 0)}</span>
    </div>
  );
}

export function ProjectProfitPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error, refetch } = useProjectProfit(id);

  if (isLoading) return <Skeleton className="h-96 w-full mt-6" />;
  if (isError) return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb={[{ to: '/director', label: 'Director' }, { to: '/director/profitability', label: 'Profitability' }, { label: 'Project' }]} title="Project profitability" />
      <ErrorState message={error.message} onRetry={refetch} />
    </div>
  );

  const p = data ?? {};
  const isLoss = parseFloat(p.profit ?? 0) < 0;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/director/profitability" className="inline-flex items-center gap-1 text-small text-muted hover:text-ink">
        <ArrowLeft size={14} /> Back to profitability
      </Link>

      <PageHeader
        breadcrumb={[{ to: '/director', label: 'Director' }, { to: '/director/profitability', label: 'Profitability' }, { label: p.code ?? 'Project' }]}
        title={p.code ?? 'Project profitability'}
        subtitle={``}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-small text-muted mb-1">Revenue</p>
          <p className="text-2xl font-bold tabular-nums text-ink">{formatINR(p.revenue ?? 0)}</p>
          {p.isEstimated && <p className="text-micro text-muted mt-1">Estimated from quote (no tax invoice yet)</p>}
        </Card>
        <Card className="p-5">
          <p className="text-small text-muted mb-1">Total cost</p>
          <p className="text-2xl font-bold tabular-nums text-ink">{formatINR(p.totalCost ?? 0)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-small text-muted mb-1">Profit / (Loss)</p>
          <p className={cn('text-2xl font-bold tabular-nums', isLoss ? 'text-alert' : 'text-leaf')}>
            {formatINR(p.profit ?? 0)}
          </p>
          <p className={cn('text-small mt-1', isLoss ? 'text-alert' : 'text-muted')}>
            Margin: {p.margin ?? '0'}%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold text-ink mb-3">Cost breakdown (BR-13)</h3>
          <div className="divide-y divide-line">
            <CostRow label="Material cost (dispatch)" amount={p.materialCost} />
            <CostRow label="Labour cost (time logs)" amount={p.labourCost} />
            <CostRow label="Project expenses" amount={p.expenseCost} />
            <CostRow label="Warranty service cost" amount={p.warrantyCost} />
            <CostRow label="Total cost" amount={p.totalCost} highlight />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink mb-3">Project details</h3>
          <div className="flex flex-col gap-2">
            {p.code && (
              <div className="flex items-center justify-between">
                <span className="text-small text-muted">Project code</span>
                <span className="font-mono text-small font-medium">{p.code}</span>
              </div>
            )}
            {p.isEstimated !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-small text-muted">Revenue source</span>
                <span className="text-small">{p.isEstimated ? 'Quote estimate (no tax invoice yet)' : 'Tax invoice'}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
