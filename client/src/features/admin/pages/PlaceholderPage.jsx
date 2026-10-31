import { Link } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { PageHeader, Card, EmptyState, Button } from '@/components/ui';

/**
 * The clean placeholder page every role lands on until that member has built the real one.
 *
 * `owner` names the teammate so a judge or a reviewer can see at a glance who is building it.
 * No lorem ipsum, no exclamation marks (DESIGN.md section 13).
 */
export function PlaceholderPage({ title, subtitle, breadcrumb, owner, module, home }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={breadcrumb}
        title={title}
        subtitle={subtitle}
        actions={
          home ? (
            <Button as={Link} to={home} variant="outline">
              Back home
            </Button>
          ) : null
        }
      />
      <Card>
        <EmptyState
          icon={Hammer}
          title={`${module} is being built`}
          description={
            owner
              ? `${owner} is implementing this module. The route is reserved and will light up when the first screen lands.`
              : 'This module is being built. The route is reserved and will light up when the first screen lands.'
          }
          action={
            <p className="text-small text-muted">
              Server status: <span className="font-mono text-ink">501 NOT_IMPLEMENTED</span>
            </p>
          }
        />
      </Card>
    </div>
  );
}
