import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Input, Button, Card, PageHeader } from '@/components/ui';
import { api } from '@/lib/api.js';
import { ApiError } from '@/lib/api.js';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/[0-9]/, 'Include at least one number.'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.',
  });

export function ChangePasswordPage() {
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password updated.');
      reset();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something failed. Try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Account' }, { label: 'Change password' }]}
        title="Change password"
        subtitle="Set a new password for your account."
      />
      <Card className="max-w-xl">
        {serverError && (
          <div role="alert" className="mb-4 rounded-input border border-alert-soft bg-alert-soft/40 px-3 py-2 text-small text-alert">
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Current password" type="password" required error={errors.currentPassword?.message} {...register('currentPassword')} />
          <Input label="New password" type="password" required hint="At least 8 characters, with a letter and a number." error={errors.newPassword?.message} {...register('newPassword')} />
          <Input label="Confirm new password" type="password" required error={errors.confirm?.message} {...register('confirm')} />
          <div>
            <Button type="submit" loading={isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
