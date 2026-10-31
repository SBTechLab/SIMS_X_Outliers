import { PageHeader, Card, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate } from '@/lib/format.js';
import { useMySystems } from '../hooks.js';
import { cn } from '@/lib/cn.js';

function WarrantyChip({ warranty }) {
  if (!warranty) return <span className="text-muted text-xs">No warranty</span>;
  const { status, endDate } = warranty;
  const color = status === 'ACTIVE' ? 'text-leaf bg-leaf/10' : status === 'EXPIRED' ? 'text-muted bg-muted/10' : 'text-alert bg-alert/10';
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded', color)}>
      {status} {status === 'ACTIVE' && endDate ? `· until ${formatDate(endDate)}` : ''}
    </span>
  );
}

function SerialRow({ unit }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-line last:border-0">
      <div>
        <p className="font-mono text-small text-ink">{unit.serialNumber}</p>
        <p className="text-small text-muted">{unit.product?.name}</p>
      </div>
      <WarrantyChip warranty={unit.warranty} />
    </div>
  );
}

function SystemCard({ project }) {
  const units = project.serialUnits ?? [];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono font-semibold text-ink">{project.code}</p>
          <p className="text-small text-muted">{project.systemType?.replace(/_/g, ' ')} · {project.capacityKw} kW</p>
          {project.siteAddress && <p className="text-small text-muted mt-0.5">{project.siteAddress}</p>}
        </div>
        {project.installedAt && <p className="text-small text-muted">Installed {formatDate(project.installedAt)}</p>}
      </div>
      {units.length > 0 && (
        <div className="mt-4">
          <p className="text-small font-medium text-ink mb-2">Equipment ({units.length} unit{units.length !== 1 ? 's' : ''})</p>
          {units.map(u => <SerialRow key={u.id} unit={u} />)}
        </div>
      )}
      {units.length === 0 && <p className="text-small text-muted mt-3">No serialized equipment on record.</p>}
    </Card>
  );
}

export function PortalSystemsPage() {
  const { data, isLoading, isError, error, refetch } = useMySystems();
  const systems = Array.isArray(data?.systems) ? data.systems : Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ to: '/portal', label: 'My account' }, { label: 'My systems' }]}
        title="My systems"
        subtitle="Installed solar systems and the warranty status of each component."
      />

      {isLoading ? <Skeleton className="h-64 w-full" /> : isError ? <ErrorState message={error.message} onRetry={refetch} /> :
        systems.length === 0 ? <EmptyState title="No installed systems" description="Your systems will appear here after installation is complete." /> :
        <div className="flex flex-col gap-4">{systems.map(s => <SystemCard key={s.id} project={s} />)}</div>
      }
    </div>
  );
}
