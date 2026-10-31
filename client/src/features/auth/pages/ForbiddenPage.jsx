import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button.jsx';
import { useAuth } from '@/app/providers.jsx';
import { roleHome } from '@/routes/roleHome.js';

export function ForbiddenPage() {
  const { user } = useAuth();
  const home = user ? roleHome(user.role) : '/login';

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-alert-soft text-alert">
        <ShieldAlert size={28} aria-hidden="true" />
      </div>
      <h1 className="text-h1 text-ink">403 — Not permitted</h1>
      <p className="max-w-md text-body text-muted">
        You are signed in, but your role does not have access to this page. Ask your administrator
        if you believe this is wrong.
      </p>
      <Button as={Link} to={home} variant="outline">
        Go to your home
      </Button>
    </div>
  );
}
