import { Outlet } from 'react-router-dom';
import { BrandMark } from './BrandMark.jsx';

/**
 * Split screen for sign-in and register (DESIGN.md section 8.2).
 *
 * The photo is left-aligned at 45% from lg up, collapses to a 160px top banner below. The
 * image is loaded from a public placeholder — replace with a credited photo from ASSETS.md.
 */
const BG_IMAGE =
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1600&q=80';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper lg:flex-row">
      <aside className="relative overflow-hidden bg-ink lg:w-[45%]">
        <img
          src={BG_IMAGE}
          alt="Rooftop solar array in bright sunlight"
          className="h-[160px] w-full object-cover opacity-80 lg:h-full"
          loading="eager"
          fetchpriority="high"
        />
        <div className="absolute inset-0 bg-ink/25" aria-hidden="true" />
        <div className="absolute inset-0 flex flex-col justify-between p-6 lg:p-10">
          <BrandMark color="light" />
          <p className="hidden max-w-sm text-h3 font-display text-white lg:block">
            Over 1,200 rooftops powered across Telangana.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10 md:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
