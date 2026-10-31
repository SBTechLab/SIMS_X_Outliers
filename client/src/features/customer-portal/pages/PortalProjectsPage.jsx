import { Card, StatusBadge, Skeleton, EmptyState, ErrorState, Stepper, stepsForProjectStatus } from '@/components/ui';
import { formatDate, formatCapacity, formatINR } from '@/lib/format.js';
import { useMyProjects } from '../hooks.js';

export function PortalProjectsPage() {
  const { data, isLoading, isError, error, refetch } = useMyProjects();

  if (isLoading) return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-card" />)}
    </div>
  );

  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const projects = Array.isArray(data?.projects) ? data.projects : [];

  if (projects.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No projects yet" description="Your solar project will appear here after the quote is accepted." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {projects.map((project) => (
        <Card key={project.id}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="font-mono text-small text-muted">{project.code}</span>
              <div className="font-medium mt-0.5">{formatCapacity(project.capacityKw)} {project.systemType?.replace('_', '-')}</div>
            </div>
            <StatusBadge enumName="ProjectStatus" value={project.status} />
          </div>
          {project.quote && (
            <div className="text-small text-muted mb-3">
              Total: <span className="font-medium text-ink">{formatINR(project.quote.total)}</span>
            </div>
          )}
          <Stepper steps={stepsForProjectStatus(project.status)} />
          <div className="text-micro text-muted mt-3">Created {formatDate(project.createdAt)}</div>
        </Card>
      ))}
    </div>
  );
}
