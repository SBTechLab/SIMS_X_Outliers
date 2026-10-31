import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api.js';
import { Button, Card, Checkbox, Input, Select, PageHeader } from '@/components/ui';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number.'),
  email: z.string().trim().email('Enter a valid email.').optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  pincode: z.string().trim().max(10).optional().or(z.literal('')),
  requestedSystemType: z.enum(['ON_GRID', 'OFF_GRID', 'NOT_SURE']),
  requestedCapacityKw: z.coerce.number().min(0.5).max(10).optional(),
  wantsSubsidy: z.boolean().default(false),
});

export function EnquiryPage() {
  const [code, setCode] = useState(null);
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { requestedSystemType: 'ON_GRID', wantsSubsidy: true },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const result = await api.post('/public/enquiries', {
        ...values,
        email: values.email || undefined,
        address: values.address || undefined,
        city: values.city || undefined,
        pincode: values.pincode || undefined,
      });
      setCode(result.code);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something failed. Try again.');
    }
  };

  if (code) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center md:px-6">
        <CheckCircle size={48} className="text-leaf" aria-hidden="true" />
        <h1 className="text-h1 text-ink">Thanks — we have your enquiry.</h1>
        <p className="text-body text-muted">
          Your reference number is <span className="font-mono text-ink">{code}</span>. A sales executive will call you within one working day.
        </p>
        <Button as={Link} to="/" variant="outline">
          Back to the home page
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 md:px-6">
      <PageHeader title="Request a quote" subtitle="Fill in the basics and we will call you back." />
      <Card>
        {serverError && (
          <div role="alert" className="mb-4 rounded-input border border-alert-soft bg-alert-soft/40 px-3 py-2 text-small text-alert">
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2" noValidate>
          <Input label="Full name" required error={errors.name?.message} {...register('name')} wrapperClassName="md:col-span-2" />
          <Input label="Mobile number" prefix="+91" inputMode="numeric" maxLength={10} required error={errors.phone?.message} {...register('phone')} />
          <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Address" error={errors.address?.message} {...register('address')} wrapperClassName="md:col-span-2" />
          <Input label="City" error={errors.city?.message} {...register('city')} />
          <Input label="Pincode" error={errors.pincode?.message} {...register('pincode')} />
          <Select
            label="System type"
            required
            error={errors.requestedSystemType?.message}
            {...register('requestedSystemType')}
            options={[
              { value: 'ON_GRID', label: 'On-Grid (grid-tied, net metering)' },
              { value: 'OFF_GRID', label: 'Off-Grid (battery backup)' },
              { value: 'NOT_SURE', label: 'Not sure yet' },
            ]}
          />
          <Input label="Approximate capacity (kW)" type="number" step="0.5" min="0.5" max="10" error={errors.requestedCapacityKw?.message} {...register('requestedCapacityKw')} />
          <div className="md:col-span-2">
            <Checkbox label="I want to apply for the PM Surya Ghar subsidy" {...register('wantsSubsidy')} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
              Submit enquiry
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
