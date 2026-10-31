import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Card, StatusBadge, Button, Skeleton, EmptyState, ErrorState, ConfirmDialog } from '@/components/ui';
import { formatDate, formatINR, formatCapacity } from '@/lib/format.js';
import { useMyQuotes, useAcceptQuote, useRejectQuote } from '../hooks.js';

export function PortalQuotesPage() {
  const { data, isLoading, isError, error, refetch } = useMyQuotes();
  const acceptMutation = useAcceptQuote();
  const rejectMutation = useRejectQuote();
  const [confirmAccept, setConfirmAccept] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);

  if (isLoading) return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2].map((i) => <Skeleton key={i} className="h-36 w-full rounded-card" />)}
    </div>
  );

  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const quotes = Array.isArray(data?.quotes) ? data.quotes : [];

  if (quotes.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No quotes yet" description="Your solar installation quote will appear here once your survey is approved." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {quotes.map((quote) => (
        <Card key={quote.id}>
          <div className="flex items-start justify-between mb-2">
            <span className="font-mono text-small text-muted">{quote.number}</span>
            <StatusBadge enumName="QuoteStatus" value={quote.status} />
          </div>
          <div className="text-base font-medium">{formatINR(quote.total)}</div>
          <div className="text-small text-muted mt-1">
            {formatCapacity(quote.capacityKw)} · {quote.systemType?.replace('_', '-')}
          </div>
          <div className="text-small text-muted mt-1">
            Valid until {formatDate(quote.validUntil)}
          </div>
          {quote.status === 'SENT' && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                icon={X}
                onClick={() => setConfirmReject(quote.id)}
              >
                Decline
              </Button>
              <Button
                size="sm"
                icon={Check}
                onClick={() => setConfirmAccept(quote.id)}
              >
                Accept quote
              </Button>
            </div>
          )}
        </Card>
      ))}

      <ConfirmDialog
        open={!!confirmAccept}
        onClose={() => setConfirmAccept(null)}
        title="Accept this quote?"
        description="Accepting will create your project. An advance payment will be required to confirm it."
        confirmLabel="Accept"
        onConfirm={() => acceptMutation.mutate(confirmAccept, { onSuccess: () => setConfirmAccept(null) })}
        loading={acceptMutation.isPending}
      />
      <ConfirmDialog
        open={!!confirmReject}
        onClose={() => setConfirmReject(null)}
        title="Decline this quote?"
        description="This will mark the quote as declined. Contact your sales executive if you want a revised quote."
        confirmLabel="Decline"
        variant="danger"
        onConfirm={() => rejectMutation.mutate(confirmReject, { onSuccess: () => setConfirmReject(null) })}
        loading={rejectMutation.isPending}
      />
    </div>
  );
}
