import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signOutApi = vi.fn();
vi.mock('@/shared/lib/supabase', () => {
  const chain = { select: () => chain, eq: () => chain, single: () => Promise.resolve({ data: null }) };
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: (...a: unknown[]) => signOutApi(...a),
      },
      from: () => chain,
    },
  };
});

import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import type { AuthValue } from './context';

function setup() {
  let value!: AuthValue;
  function Probe() {
    value = useAuth();
    return null;
  }
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  return () => value;
}

describe('signOut', () => {
  beforeEach(() => {
    signOutApi.mockReset();
  });

  it('signs out globally when that works', async () => {
    signOutApi.mockResolvedValue({ error: null });
    const get = setup();
    await act(async () => get().signOut());
    expect(signOutApi).toHaveBeenCalledTimes(1);
    expect(signOutApi).toHaveBeenCalledWith();
  });

  it('falls back to a local sign-out when the global one errors (session already invalid on the server)', async () => {
    signOutApi.mockResolvedValueOnce({ error: { message: 'Session not found' } }).mockResolvedValueOnce({ error: null });
    const get = setup();
    await act(async () => get().signOut());
    expect(signOutApi).toHaveBeenNthCalledWith(2, { scope: 'local' });
  });

  it('falls back to a local sign-out when the global one throws', async () => {
    signOutApi.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ error: null });
    const get = setup();
    await act(async () => get().signOut());
    expect(signOutApi).toHaveBeenNthCalledWith(2, { scope: 'local' });
  });
});
