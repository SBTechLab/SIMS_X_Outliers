import { useNavigate } from 'react-router-dom';
import { MapPin, Clock } from 'lucide-react';
import { Card, StatusBadge, Button, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format.js';
import { useMySurveys } from '../hooks.js';

export function MySurveysPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useMySurveys({});

  if (isLoading) return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-card" />)}
    </div>
  );

  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const surveys = Array.isArray(data) ? data : [];

  if (surveys.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No surveys assigned" description="Assigned surveys will appear here." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {surveys.map((survey) => (
        <Card
          key={survey.id}
          className="cursor-pointer active:opacity-70"
          onClick={() => navigate(`/field/surveys/${survey.id}`)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-small text-muted">{survey.lead?.code}</span>
                <StatusBadge enumName="SurveyStatus" value={survey.status} />
              </div>
              <div className="font-medium truncate">{survey.lead?.name}</div>
              <div className="flex items-center gap-1 text-small text-muted mt-1">
                <MapPin size={12} />
                <span className="truncate">{survey.lead?.city ?? 'City not set'}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-small text-muted">
                <Clock size={12} />
                <span>{formatDate(survey.scheduledAt)}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
