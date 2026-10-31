import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { Skeleton } from './Skeleton.jsx';

/**
 * The headline tile on every dashboard: a label, a big value, a delta chip, and an optional
 * sparkline slot.
 *
 * The delta always names the comparison period — "vs last month" — because an unqualified
 * green arrow is one of the "AI-generated dashboard" tells (DESIGN.md section 13).
 */
export function StatCard({ label, value, delta, deltaLabel, sparkline, loading, className }) {
  if (loading) return <Skeleton variant="card" className={className} />;

  return (
    <div className={cn('rounded-card border border-line bg-surface p-5 md:p-6', className)}>
      <p className="text-micro uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-h1 tnum text-ink">{value}</p>
      {(delta !== undefined || sparkline) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <Delta value={delta} label={deltaLabel} />
          {sparkline && <div className="h-10 w-24">{sparkline}</div>}
        </div>
      )}
    </div>
  );
}

function Delta({ value, label }) {
  if (value === null || value === undefined) {
    return <span className="text-small text-muted">{label ?? 'No comparison'}</span>;
  }

  const n = Number(value);
  const Icon = n > 0 ? ArrowUp : n < 0 ? ArrowDown : Minus;
  const colour = n > 0 ? 'text-leaf' : n < 0 ? 'text-alert' : 'text-muted';

  return (
    <span className={cn('inline-flex items-center gap-1 text-small', colour)}>
      <Icon size={14} aria-hidden="true" />
      <span className="tnum">{Math.abs(n).toFixed(1)}%</span>
      {label && <span className="text-muted">{label}</span>}
    </span>
  );
}

