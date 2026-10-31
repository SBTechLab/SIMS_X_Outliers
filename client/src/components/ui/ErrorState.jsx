import { AlertCircle } from 'lucide-react';
import { Button } from './Button.jsx';

/**
 * Inline error with a Retry — the error state every page must handle (RULES.md section 10).
 *
 * The message is the server's, not a generic one, so the user knows which specific thing failed.
 */
export function ErrorState({ title = 'Something failed to load', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-alert-soft bg-alert-soft/40 px-6 py-10 text-center">
      <AlertCircle size={28} className="text-alert" aria-hidden="true" />
      <p className="mt-3 text-body font-medium text-ink">{title}</p>
      {message && <p className="mt-1 max-w-md text-small text-muted">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          Try again
        </Button>
      )}
    </div>
  );
}

