import { Toaster as SonnerToaster } from 'sonner';

/**
 * The toast container, mounted once in providers.jsx. Top-right on desktop, bottom-centre on
 * a phone (above the FieldLayout tab bar). No emojis, no icons beyond the coloured left bar.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      mobileOffset={{ bottom: 80 }}
      duration={4000}
      closeButton
      richColors={false}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'rounded-card border border-line bg-surface shadow-md text-ink text-body px-4 py-3',
          title: 'text-ink font-medium',
          description: 'text-muted text-small',
          success: 'border-l-4 border-l-leaf',
          error: 'border-l-4 border-l-alert',
          info: 'border-l-4 border-l-sky',
          warning: 'border-l-4 border-l-sun',
        },
      }}
    />
  );
}

