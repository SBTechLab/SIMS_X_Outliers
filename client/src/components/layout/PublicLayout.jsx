import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { BrandMark } from './BrandMark.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { cn } from '@/lib/cn.js';

/**
 * Marketing shell: sticky top nav, white, bottom line border, Fraunces-ready content area,
 * ink footer with real contact details.
 */
const links = [
  { to: '/#packages', label: 'Packages' },
  { to: '/#how', label: 'How it works' },
  { to: '/#subsidy', label: 'Subsidy' },
  { to: '/#contact', label: 'Contact' },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
          <Link to="/" aria-label="SunPower Solutions home">
            <BrandMark />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className="text-body text-ink hover:text-sun-deep">
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="outline" size="sm" as={Link} to="/login">
              Sign in
            </Button>
            <Button size="sm" as={Link} to="/#quote">
              Get a quote
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-input p-2 text-ink md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div
          className={cn(
            'overflow-hidden bg-ink text-white transition-[max-height] duration-200 md:hidden',
            open ? 'max-h-96' : 'max-h-0',
          )}
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1 px-4 py-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-input px-3 py-3 hover:bg-ink-soft"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 pt-2">
              <Button variant="outline" fullWidth as={Link} to="/login">
                Sign in
              </Button>
              <Button fullWidth as={Link} to="/#quote">
                Get a quote
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer id="contact" className="border-t border-line bg-ink text-white">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
          <div>
            <BrandMark color="light" />
            <p className="mt-3 text-small text-white/70">
              Rooftop solar for homes and small factories across Telangana.
            </p>
          </div>
          <div>
            <p className="mb-3 text-micro uppercase tracking-wider text-white/60">Packages</p>
            <ul className="space-y-2 text-small text-white/80">
              <li>On-Grid 1–5 kW</li>
              <li>Off-Grid 1–5 kW</li>
              <li>Subsidy-eligible installs</li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-micro uppercase tracking-wider text-white/60">Support</p>
            <ul className="space-y-2 text-small text-white/80">
              <li>care@sunpower.in</li>
              <li>+91 40 2712 4188</li>
              <li>Mon–Sat 9:30 am – 7:00 pm</li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-micro uppercase tracking-wider text-white/60">Contact</p>
            <address className="not-italic text-small text-white/80">
              Plot 14, Phase II
              <br />
              IDA Cherlapally, Hyderabad 500051
              <br />
              Telangana, India
              <br />
              GSTIN 36AABCS1429P1ZV
            </address>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-micro text-white/60">
          © {new Date().getFullYear()} SunPower Solutions. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
