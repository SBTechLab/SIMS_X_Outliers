import { AppRoutes } from '@/routes/AppRoutes.jsx';

/**
 * The top of the component tree. Everything else — the providers, the router,
 * the layouts and the pages — are mounted below this.
 */
export function App() {
  return <AppRoutes />;
}
