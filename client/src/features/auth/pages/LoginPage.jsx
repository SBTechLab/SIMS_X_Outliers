import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Input, Button, Card, IconButton } from '@/components/ui';
import { useAuth } from '@/app/providers.jsx';
import { roleHome } from '@/routes/roleHome.js';
import { ApiError } from '@/lib/api.js';

const schema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone number.').max(120),
  password: z.string().min(1, 'Enter your password.').max(72),
});

/** The demo-account chips — one click each, so judges can jump straight into a role. */
const DEMO = [
  { role: 'SUPER_ADMIN', label: 'Super admin', identifier: 'admin@sunpower.in' },
  { role: 'DIRECTOR', label: 'Director', identifier: 'director@sunpower.in' },
  { role: 'SALES_EXECUTIVE', label: 'Sales', identifier: 'sales1@sunpower.in' },
  { role: 'SURVEY_TECHNICIAN', label: 'Survey tech', identifier: 'survey1@sunpower.in' },
  { role: 'WAREHOUSE_MANAGER', label: 'Warehouse', identifier: 'warehouse@sunpower.in' },
  { role: 'INSTALLATION_TECHNICIAN', label: 'Install tech', identifier: 'install1@sunpower.in' },
  { role: 'SUPPORT_EXECUTIVE', label: 'Support', identifier: 'support@sunpower.in' },
  { role: 'CUSTOMER', label: 'Customer', identifier: '9848012345' },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const signedIn = await login(values);
      const from = location.state?.from?.pathname;
      navigate(from && from !== '/login' ? from : roleHome(signedIn.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
        if (err.code === 'ACCOUNT_DISABLED') toast.error(err.message);
      } else {
        setServerError('Cannot reach the server. Check it is running on port 5000.');
      }
    }
  };

  const fill = (identifier) => {
    setValue('identifier', identifier, { shouldDirty: true, shouldValidate: true });
    setValue('password', 'Demo@1234', { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 text-ink">Sign in</h1>
        <p className="mt-1 text-small text-muted">
          Staff sign in by email. Customers sign in by phone.
        </p>
      </div>

      {serverError && (
        <div role="alert" className="rounded-input border border-alert-soft bg-alert-soft/40 px-3 py-2 text-small text-alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email or phone"
          placeholder="you@sunpower.in"
          autoComplete="username"
          required
          error={errors.identifier?.message}
          {...register('identifier')}
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          error={errors.password?.message}
          suffix={
            <IconButton
              icon={showPassword ? EyeOff : Eye}
              label={showPassword ? 'Hide password' : 'Show password'}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                setShowPassword((v) => !v);
              }}
              className="pointer-events-auto -mr-2"
            />
          }
          {...register('password')}
        />

        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Sign in
        </Button>
      </form>

      <p className="text-center text-small text-muted">
        New customer? <Link to="/register" className="text-sky hover:underline">Create an account</Link>
      </p>

      <Card title="Demo accounts" description="Click any role to fill the form. Password: Demo@1234">
        <div className="flex flex-wrap gap-2">
          {DEMO.map((row) => (
            <button
              key={row.role}
              type="button"
              onClick={() => fill(row.identifier)}
              className="inline-flex items-center gap-1.5 rounded-input border border-line bg-paper px-3 py-1.5 text-small text-ink transition-colors hover:border-sun hover:bg-amber-soft focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2"
            >
              <Zap size={12} className="text-sun" aria-hidden="true" />
              {row.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
