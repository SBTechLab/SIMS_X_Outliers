import { Sun } from 'lucide-react';
import { cn } from '@/lib/cn.js';

/** The logo lockup from DESIGN.md section 1: sun mark + wordmark. */
export function BrandMark({ color = 'ink', compact = false, className }) {
  const textColour = color === 'light' ? 'text-white' : 'text-ink';
  const subColour = color === 'light' ? 'text-white/70' : 'text-muted';

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Sun size={22} strokeWidth={2} className="text-sun" aria-hidden="true" />
      {!compact && (
        <span className="flex items-baseline gap-1 leading-none">
          <span className={cn('text-h3 font-bold tracking-tight', textColour)}>SunPower</span>
          <span className={cn('text-small font-medium', subColour)}>Solutions</span>
        </span>
      )}
    </span>
  );
}
