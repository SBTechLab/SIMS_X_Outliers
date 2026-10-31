import { cn } from '@/lib/cn.js';

/**
 * A centred panel for "nothing here yet", with one helpful sentence and one action.
 *
 * Never an exclamation mark, never a shrugging mascot. The copy names what will appear and
 * why (DESIGN.md section 5).
 */
export function EmptyState({ icon: Icon, image, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {image && (
        <img
          src={image}
          alt=""
          width={96}
          height={96}
          className="mb-5 h-24 w-24 rounded-card object-cover"
        />
      )}
      {!image && Icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-ink-tint text-muted">
          <Icon size={28} aria-hidden="true" />
        </div>
      )}
      <h3 className="text-h3 text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-small text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

