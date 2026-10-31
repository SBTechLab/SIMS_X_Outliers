import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Building2, Percent, Wrench, Clock, AlertCircle } from 'lucide-react';
import { PageHeader, Tabs, TabList, Tab, TabPanel, Card, Input, Button, Skeleton } from '@/components/ui';
import { useSettings, useUpdateSettings } from '../hooks.js';

const settingsSchema = z.object({
  company: z.object({
    name: z.string().min(2, 'Company name is required'),
    gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Valid 15-character GSTIN required'),
    address: z.string().min(5, 'Address is required'),
    phone: z.string().min(8, 'Phone is required'),
    email: z.string().email('Valid email required'),
  }),
  advancePercent: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
  defaultTaxPercent: z.coerce.number().min(0).max(100, 'Must be between 0 and 100'),
  quoteValidityDays: z.coerce.number().int().min(1, 'Must be at least 1 day'),
  labourRatePerHour: z.coerce.number().min(0, 'Cannot be negative'),
  serviceVisitCharge: z.coerce.number().min(0, 'Cannot be negative'),
  warrantyExpiryAlertDays: z.coerce.number().int().min(1, 'Must be at least 1 day'),
  surveySlaHours: z.coerce.number().int().min(1, 'Must be at least 1 hour'),
});

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const [activeTab, setActiveTab] = useState('company');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    if (settings) {
      reset({
        company: {
          name: settings.company?.name || '',
          gstin: settings.company?.gstin || '',
          address: settings.company?.address || '',
          phone: settings.company?.phone || '',
          email: settings.company?.email || '',
        },
        advancePercent: settings.advancePercent ?? 30,
        defaultTaxPercent: settings.defaultTaxPercent ?? 18,
        quoteValidityDays: settings.quoteValidityDays ?? 15,
        labourRatePerHour: settings.labourRatePerHour ?? 450,
        serviceVisitCharge: settings.serviceVisitCharge ?? 500,
        warrantyExpiryAlertDays: settings.warrantyExpiryAlertDays ?? 30,
        surveySlaHours: settings.surveySlaHours ?? 48,
      });
    }
  }, [settings, reset]);

  const onSubmit = (data) => {
    updateSettingsMutation.mutate(data, {
      onSuccess: () => {
        reset(data); // reset dirty state
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Settings" subtitle="Business parameters, tax rates, and SLA thresholds." />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20">
      <PageHeader
        title="System Settings"
        subtitle="Global parameters applied across the organisation. Rates are read dynamically, never hard-coded (BR-14)."
      />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab value="company" icon={Building2}>Company</Tab>
          <Tab value="commercial" icon={Percent}>Commercial</Tab>
          <Tab value="service" icon={Wrench}>Service</Tab>
          <Tab value="operations" icon={Clock}>Operations</Tab>
        </TabList>

        {/* Company Settings */}
        <TabPanel value="company">
          <Card className="p-6 max-w-2xl space-y-4">
            <h3 className="text-base font-semibold text-ink">Company Profile</h3>
            <p className="text-xs text-muted">
              Used across quotes, invoices, delivery packing slips, and public paperwork.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Company Legal Name</label>
                <Input {...register('company.name')} error={errors.company?.name?.message} />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">GSTIN Number</label>
                <Input
                  {...register('company.gstin')}
                  placeholder="36AABCS1429P1ZV"
                  error={errors.company?.gstin?.message}
                  className="font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Registered Address</label>
                <Input {...register('company.address')} error={errors.company?.address?.message} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Office Phone</label>
                  <Input {...register('company.phone')} error={errors.company?.phone?.message} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Support Email</label>
                  <Input type="email" {...register('company.email')} error={errors.company?.email?.message} />
                </div>
              </div>
            </div>
          </Card>
        </TabPanel>

        {/* Commercial Settings */}
        <TabPanel value="commercial">
          <Card className="p-6 max-w-2xl space-y-4">
            <h3 className="text-base font-semibold text-ink">Commercial & Payment Policies</h3>
            <p className="text-xs text-muted">
              Rules governing customer payments, order confirmation, and quote validity.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Required Order Confirmation Advance (%)
                </label>
                <Input
                  type="number"
                  step="1"
                  {...register('advancePercent')}
                  error={errors.advancePercent?.message}
                />
                <span className="text-[11px] text-muted">
                  BR-05: Orders cannot be confirmed until payments received ≥ this percentage. Default: 30%.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Default GST Rate (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  {...register('defaultTaxPercent')}
                  error={errors.defaultTaxPercent?.message}
                />
                <span className="text-[11px] text-muted">
                  Applicable GST percentage on quotes and invoices. Standard: 18%.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Quote Validity (Days)</label>
                <Input
                  type="number"
                  step="1"
                  {...register('quoteValidityDays')}
                  error={errors.quoteValidityDays?.message}
                />
                <span className="text-[11px] text-muted">
                  Number of days before an accepted/sent quote expires. Default: 15 days.
                </span>
              </div>
            </div>
          </Card>
        </TabPanel>

        {/* Service Settings */}
        <TabPanel value="service">
          <Card className="p-6 max-w-2xl space-y-4">
            <h3 className="text-base font-semibold text-ink">Service & Maintenance Rates</h3>
            <p className="text-xs text-muted">
              Billing rates applied to customer support tickets and post-warranty repairs.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Standard Labour Rate (INR / hour)
                </label>
                <Input
                  type="number"
                  step="50"
                  {...register('labourRatePerHour')}
                  error={errors.labourRatePerHour?.message}
                />
                <span className="text-[11px] text-muted">
                  Applied to billable service tickets when outside warranty (BR-11).
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Standard Service Visit Charge (INR)
                </label>
                <Input
                  type="number"
                  step="50"
                  {...register('serviceVisitCharge')}
                  error={errors.serviceVisitCharge?.message}
                />
                <span className="text-[11px] text-muted">
                  Base site visit inspection fee for non-warranty tickets.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Warranty Expiry Alert Window (Days)
                </label>
                <Input
                  type="number"
                  step="1"
                  {...register('warrantyExpiryAlertDays')}
                  error={errors.warrantyExpiryAlertDays?.message}
                />
                <span className="text-[11px] text-muted">
                  Advance warning days before automated alert notifies support of expiring serials. Default: 30 days.
                </span>
              </div>
            </div>
          </Card>
        </TabPanel>

        {/* Operations Settings */}
        <TabPanel value="operations">
          <Card className="p-6 max-w-2xl space-y-4">
            <h3 className="text-base font-semibold text-ink">Operational SLA Thresholds</h3>
            <p className="text-xs text-muted">
              Turnaround time limits and automated escalation triggers.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Survey Completion SLA (Hours)
                </label>
                <Input
                  type="number"
                  step="1"
                  {...register('surveySlaHours')}
                  error={errors.surveySlaHours?.message}
                />
                <span className="text-[11px] text-muted">
                  Target window between survey scheduling and mobile report submission. Default: 48 hours.
                </span>
              </div>
            </div>
          </Card>
        </TabPanel>
      </Tabs>

      {/* Sticky Save Bar */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-ink border-t border-line/20 px-6 py-3.5 z-40 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 text-paper text-sm">
            <AlertCircle className="w-4 h-4 text-sun" />
            <span>You have unsaved configuration changes.</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => reset()}
              className="text-paper border-line/40 hover:bg-ink-soft"
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={updateSettingsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save Configuration
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

