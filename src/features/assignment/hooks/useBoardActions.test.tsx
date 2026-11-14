import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from 'trust-ui-react';
import { useWorkspaceStore } from '../store';
import { NEW_MINISTRY } from '../domain/resolveDrop';
import { useBoardActions } from './useBoardActions';

vi.mock('./executeOps', () => ({ executeOps: vi.fn(async () => {}) }));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

describe('useBoardActions.perform', () => {
  it('clears the supervisor filter when a new ministry is created, so it stays visible', async () => {
    useWorkspaceStore.getState().setSupervisorFilter('p1');
    const { result } = renderHook(() => useBoardActions('EQ'), { wrapper });
    await act(() =>
      result.current.perform([
        { type: 'createMinistry' },
        { type: 'add', role: 'recipient', ministryId: NEW_MINISTRY, targetId: 'h1' },
      ]),
    );
    expect(useWorkspaceStore.getState().supervisorFilter).toBeNull();
  });

  it('keeps the filter for moves between existing ministries', async () => {
    useWorkspaceStore.getState().setSupervisorFilter('p1');
    const { result } = renderHook(() => useBoardActions('EQ'), { wrapper });
    await act(() => result.current.perform([{ type: 'add', role: 'recipient', ministryId: 'g1', targetId: 'h1' }]));
    expect(useWorkspaceStore.getState().supervisorFilter).toBe('p1');
  });
});
