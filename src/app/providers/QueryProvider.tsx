import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';

function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; code?: string };
  return e.status === 401 || e.code === 'PGRST301';
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, err) => !isAuthError(err) && count < 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        onError: (err) => {
          if (isAuthError(err)) {
            supabase.auth.signOut();
          }
        },
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
