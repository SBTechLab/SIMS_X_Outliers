import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button } from '@/components/ui';
import { useAuth } from '@/app/providers.jsx';
import { roleHome } from '@/routes/roleHome.js';
import { ApiError } from '@/lib/api.js';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number.'),
  email: z.string().trim().email('Enter a valid email.').max(120).optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .regex(/[A-Za-z]/, 'Include at least one letter.')
    .regex(/[0-9]/, 'Include at least one number.'),
});

export function RegisterPage() {
  const { user, register: signup } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '', email: '', password: '' } });

  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const created = await signup({
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        password: values.password,
      });
      navigate(roleHome(created.role), { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something failed. Try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 text-ink">Create a customer account</h1>
        <p className="mt-1 text-small text-muted">
          Sign up to track your quote, payments, system and warranty.
        </p>
      </div>

      {serverError && (
        <div role="alert" className="rounded-input border border-alert-soft bg-alert-soft/40 px-3 py-2 text-small text-alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Full name" required error={errors.name?.message} {...register('name')} />
        <Input label="Mobile number" prefix="+91" required error={errors.phone?.message} inputMode="numeric" maxLength={10} {...register('phone')} />
        <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" required hint="At least 8 characters, with a letter and a number." error={errors.password?.message} {...register('password')} />
        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Create account
        </Button>
      </form>

      <p className="text-center text-small text-muted">
        Already have an account? <Link to="/login" className="text-sky hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
