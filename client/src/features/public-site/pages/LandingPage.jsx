import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Package, PhoneCall, Shield, Sun, Wrench } from 'lucide-react';
import { api } from '@/lib/api.js';
import { Button, Card, Skeleton } from '@/components/ui';
import { formatCapacity, formatINR } from '@/lib/format.js';

/**
 * The public landing page. Hero, packages, "how it works", subsidy, contact strip.
 * No AI-generated copy, no exclamation marks, no sparkle icons (DESIGN.md section 13).
 */
const HERO = 'https://images.unsplash.com/photo-1559347429-9ca75a2cfe5c?auto=format&fit=crop&w=1920&q=80';

export function LandingPage() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ['public', 'packages'],
    queryFn: () => api.get('/public/packages'),
  });
  const { data: stats } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: () => api.get('/public/stats'),
  });

  return (
    <>
      <section className="relative overflow-hidden">
        <img src={HERO} alt="" className="h-[520px] w-full object-cover md:h-[560px]" loading="eager" fetchpriority="high" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/0" aria-hidden="true" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
            <div className="max-w-xl text-white">
              <p className="text-micro uppercase tracking-wider text-sun">SunPower Solutions · Hyderabad</p>
              <h1 className="mt-3 font-display text-display leading-tight">
                Rooftop solar, done right from the first survey to the twentieth year.
              </h1>
              <p className="mt-4 text-body text-white/85">
                On-Grid and Off-Grid systems from 1 kW to 5 kW. Subsidy paperwork, scanned serial numbers, warranty-backed service.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" as={Link} to="/#quote" trailingIcon={ArrowRight}>
                  Get a quote
                </Button>
                <Button size="lg" variant="outline" as={Link} to="/#how" className="border-white/30 bg-white/10 text-white hover:bg-white/15">
                  How it works
                </Button>
              </div>
              {stats && (
                <dl className="mt-10 grid grid-cols-3 gap-6">
                  <Stat label="Rooftops powered" value={stats.projectsCompleted} />
                  <Stat label="kW installed" value={`${stats.kwInstalled}`} />
                  <Stat label="Years in service" value={stats.yearsActive} />
                </dl>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="packages" className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
        <SectionHeader title="Packages by capacity" subtitle="Ready-made kits with every part priced in. Pick the one your roof can hold." />
        {isLoading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Skeleton variant="card" /><Skeleton variant="card" /><Skeleton variant="card" />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {packages?.filter((p) => p.systemType === 'ON_GRID').slice(0, 6).map((kit) => (
              <article key={kit.id} className="flex flex-col rounded-card border border-line bg-surface p-5">
                <p className="text-micro uppercase tracking-wider text-sun-deep">{kit.systemType === 'ON_GRID' ? 'On-Grid' : 'Off-Grid'}</p>
                <h3 className="mt-1 text-h3 text-ink">{kit.name}</h3>
                <p className="mt-1 text-small text-muted">For about {Number(kit.capacityKw) * 120} units a month.</p>
                <p className="mt-4 text-h1 tnum text-ink">{formatINR(kit.basePrice)}</p>
                <p className="text-small text-muted">before 18% GST and subsidy</p>
                <ul className="mt-4 space-y-1.5 text-small text-ink">
                  <li className="flex items-center gap-2"><Check size={14} className="text-leaf" /> {formatCapacity(kit.capacityKw)} panels and inverter</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-leaf" /> Installation and net meter</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-leaf" /> 20-year panel warranty</li>
                </ul>
                <div className="mt-5">
                  <Button as={Link} to="/#quote" fullWidth variant="outline">
                    Request a quote
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="how" className="bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
          <SectionHeader title="How it works" subtitle="Five steps from the first call to the first unit on the meter." />
          <ol className="mt-8 grid gap-4 md:grid-cols-5">
            {[
              { icon: PhoneCall, title: 'Qualification call', text: 'Roof area, bill, grid connection.' },
              { icon: Sun, title: 'Rooftop survey', text: 'Direction, tilt, cable distance, photos.' },
              { icon: Package, title: 'Order and kit', text: 'Full BOM, scanned serial numbers.' },
              { icon: Wrench, title: 'Installation', text: 'Mount, wire, test, sign off.' },
              { icon: Shield, title: '20-year warranty', text: 'Service tickets, free while covered.' },
            ].map((step, i) => (
              <li key={step.title} className="rounded-card border border-line bg-paper p-5">
                <div className="flex items-center gap-2 text-small text-muted">
                  <span className="tnum">0{i + 1}</span>
                  <step.icon size={16} className="text-sun" aria-hidden="true" />
                </div>
                <h3 className="mt-2 text-h3 text-ink">{step.title}</h3>
                <p className="mt-1 text-small text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="subsidy" className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
        <Card>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-micro uppercase tracking-wider text-sun-deep">Subsidy</p>
              <h2 className="mt-1 text-h1 text-ink">PM Surya Ghar paperwork, handled for you.</h2>
              <p className="mt-3 text-body text-muted">
                We submit the application, book the inspection and track the disbursement. Up to ₹78,000 off a 3 kW system for a household.
              </p>
              <div className="mt-5">
                <Button as={Link} to="/#quote" trailingIcon={ArrowRight}>
                  Check if you qualify
                </Button>
              </div>
            </div>
            <ul className="space-y-2 text-body text-ink">
              <li className="flex gap-2"><Check size={16} className="mt-1 text-leaf" aria-hidden="true" /> Grid-connected 1–3 kW households are eligible.</li>
              <li className="flex gap-2"><Check size={16} className="mt-1 text-leaf" aria-hidden="true" /> Sanctioned load check during the qualification call.</li>
              <li className="flex gap-2"><Check size={16} className="mt-1 text-leaf" aria-hidden="true" /> We attach the survey report and photos to your application.</li>
              <li className="flex gap-2"><Check size={16} className="mt-1 text-leaf" aria-hidden="true" /> Disbursement tracked in your customer portal.</li>
            </ul>
          </div>
        </Card>
      </section>

      <section id="quote" className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-4 py-16 text-center md:px-6">
          <h2 className="font-display text-h1">Ready to see what your roof can do?</h2>
          <p className="max-w-xl text-body text-white/80">
            Enter your details and we will call back within one working day.
          </p>
          <Button size="lg" as={Link} to="/enquire" trailingIcon={ArrowRight}>
            Request a quote
          </Button>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-micro uppercase tracking-wider text-white/60">{label}</dt>
      <dd className="mt-1 text-h2 tnum text-white">{value}</dd>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-h1 text-ink">{title}</h2>
      {subtitle && <p className="text-body text-muted">{subtitle}</p>}
    </div>
  );
}
