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
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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

  it('warns once (without details) when it has to fall back', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    signOutApi.mockResolvedValueOnce({ error: { message: 'secret-token-abc' } }).mockResolvedValueOnce({ error: null });
    const get = setup();
    await act(async () => get().signOut());
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0])).not.toContain('secret-token-abc');
    warn.mockRestore();
  });

  it('never rejects, even when the local sign-out throws too, and clears the session state', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    signOutApi.mockResolvedValueOnce({ error: { message: 'x' } }).mockRejectedValueOnce(new Error('storage'));
    const get = setup();
    await act(async () => {
      await expect(get().signOut()).resolves.toBeUndefined();
    });
    expect(get().session).toBeNull();
    warn.mockRestore();
  });
});
