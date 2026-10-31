/**
 * The design tokens from docs/DESIGN.md, mapped into Tailwind.
 *
 * Components use these names only — no raw hex anywhere in src/components or src/features.
 * The values live as CSS variables in src/styles/index.css so a token can be redefined in
 * one place.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'ink-tint': 'var(--ink-tint)',
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        line: 'var(--line)',
        muted: 'var(--muted)',
        sun: 'var(--sun)',
        'sun-deep': 'var(--sun-deep)',
        'amber-soft': 'var(--amber-soft)',
        leaf: 'var(--leaf)',
        'leaf-soft': 'var(--leaf-soft)',
        sky: 'var(--sky)',
        'sky-soft': 'var(--sky-soft)',
        alert: 'var(--alert)',
        'alert-soft': 'var(--alert-soft)',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // name: [size, { lineHeight, fontWeight }] — the type scale from DESIGN.md section 3.
        display: ['2.5rem', { lineHeight: '3rem', fontWeight: '600' }],
        h1: ['1.75rem', { lineHeight: '2.25rem', fontWeight: '600' }],
        h2: ['1.375rem', { lineHeight: '1.875rem', fontWeight: '600' }],
        h3: ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.5rem' }],
        small: ['0.8125rem', { lineHeight: '1.25rem' }],
        label: ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '500' }],
        micro: ['0.6875rem', { lineHeight: '1rem', fontWeight: '600' }],
      },
      borderRadius: {
        input: '6px',
        card: '10px',
      },
      boxShadow: {
        // Two levels only. Everything else uses a 1px line border.
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
      },
      spacing: {
        sidebar: '248px',
        'sidebar-collapsed': '64px',
        topbar: '64px',
        'field-bar': '64px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
