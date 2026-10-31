import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { api, setUnauthenticatedHandler } from '@/lib/api.js';
import { queryClient } from '@/lib/queryClient.js';
import { Toaster } from '@/components/ui/Toaster.jsx';

/**
 * Session, API client and toast surface — the three things every screen depends on.
 *
 * While the first /auth/me call is in flight, children render against `isLoading = true`.
 * The route shell shows a skeleton; it never redirects on a maybe, or a signed-in user would
 * bounce to /login on every refresh.
 */

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <Providers>');
  return ctx;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get('/auth/me');
      setUser(me);
    } catch {
      // No session, or an expired one. The route guard handles the redirect.
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A 401 from any later request clears the session once. The axios module calls this
  // through setUnauthenticatedHandler so lib/api.js never imports React.
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      setUser(null);
      queryClient.clear();
    });
    return () => setUnauthenticatedHandler(null);
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    const result = await api.post('/auth/login', { identifier, password });
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (data) => {
    const result = await api.post('/auth/register', data);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refresh }),
    [user, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
