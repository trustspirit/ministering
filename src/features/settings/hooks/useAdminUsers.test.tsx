import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminUsersError, useAdminUsers } from './useAdminUsers';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/supabase', () => ({ supabase: { functions: { invoke } } }));

const HASH = 'ef'.repeat(28);

function setup() {
  const qc = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, ...renderHook(() => useAdminUsers(), { wrapper }) };
}

const cached = (qc: QueryClient) => JSON.stringify(qc.getMutationCache().getAll().map((m) => m.state.data ?? null));

describe('useAdminUsers', () => {
  it('does not keep a one-time link in the mutation cache once it has been read', async () => {
    invoke.mockResolvedValue({ data: { userId: 'u9', tokenHash: HASH, type: 'invite' }, error: null });
    const { qc, result } = setup();
    let link;
    await act(async () => {
      link = await result.current.createUser.mutateAsync({ email: 'a@b.c', displayName: 'A', role: 'viewer' });
    });
    expect(link).toEqual({ userId: 'u9', tokenHash: HASH, type: 'invite' });
    act(() => result.current.createUser.reset());
    await waitFor(() => expect(cached(qc)).not.toContain(HASH));
    expect(invoke).toHaveBeenCalledWith('admin-users', {
      body: { action: 'create', email: 'a@b.c', displayName: 'A', role: 'viewer' },
    });
  });

  it('turns the function error body into an AdminUsersError code', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { context: new Response(JSON.stringify({ error: 'email_exists' }), { status: 409 }) },
    });
    const { result } = setup();
    await expect(
      result.current.createUser.mutateAsync({ email: 'a@b.c', displayName: 'A', role: 'viewer' }),
    ).rejects.toEqual(new AdminUsersError('email_exists'));
  });
});
