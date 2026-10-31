import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api.js';

/**
 * TanStack Query defaults (docs/ARCHITECTURE.md section 4).
 *
 * staleTime 30s suits most lists. Screens that change under the user — dispatch packing, the
 * ticket queue — override it with staleTime: 0 in their own hook.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // A 4xx will not fix itself on retry, and retrying a 403 just makes noise.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});
