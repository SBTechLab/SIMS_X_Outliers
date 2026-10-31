import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { useAuth } from '@/app/providers.jsx';
import { roleHome } from '@/routes/roleHome.js';

export function NotFoundPage() {
  const { user } = useAuth();
  const home = user ? roleHome(user.role) : '/';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-tint text-muted">
        <Compass size={28} aria-hidden="true" />
      </div>
      <h1 className="text-h1 text-ink">404 — Page not found</h1>
      <p className="max-w-md text-body text-muted">
        We could not find the page you were looking for. It may have moved, or the link may be out of date.
      </p>
      <Button as={Link} to={home} variant="outline">
        Go to your home
      </Button>
    </div>
  );
}
