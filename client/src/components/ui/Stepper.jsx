import { Check } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { PROJECT_JOURNEY, PROJECT_STATUS } from '@/lib/constants.js';

/**
 * The horizontal project journey — the Enquiry → … → Closed strip at the top of a project
 * detail. On mobile it folds into a Timeline view instead; callers decide which to render.
 *
 * steps: [{ key, label, state: 'done' | 'current' | 'future' }]
 */
export function Stepper({ steps, className }) {
  return (
    <ol className={cn('flex items-center gap-2 overflow-x-auto no-scrollbar', className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <div className="flex min-w-[88px] flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-micro font-semibold',
                  step.state === 'done' && 'bg-leaf text-white',
                  step.state === 'current' && 'bg-sun text-ink',
                  step.state === 'future' && 'border border-line bg-surface text-muted',
                )}
              >
                {step.state === 'done' ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-micro uppercase tracking-wide',
                  step.state === 'done' && 'text-leaf',
                  step.state === 'current' && 'text-ink',
                  step.state === 'future' && 'text-muted',
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <span
                className={cn('h-0.5 w-10', step.state === 'done' ? 'bg-leaf' : 'bg-line')}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Builds the step list from a ProjectStatus. */
export function stepsForProjectStatus(current) {
  const currentIndex = PROJECT_JOURNEY.indexOf(current);
  return PROJECT_JOURNEY.map((key, i) => ({
    key,
    label: PROJECT_STATUS[key].label,
    state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'future',
  }));
}

