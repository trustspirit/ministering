import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ softDelete: vi.fn(), toast: vi.fn() }));
vi.mock('@/repositories/MemberRepository', () => ({ memberRepository: { softDelete: mocks.softDelete } }));
vi.mock('trust-ui-react', () => ({ useToast: () => ({ toast: mocks.toast }) }));

import { useDeleteMember } from './useMemberMutations';

function setup() {
  const qc = new QueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { ...renderHook(() => useDeleteMember(), { wrapper }), invalidate };
}

describe('useDeleteMember', () => {
  beforeEach(() => {
    mocks.softDelete.mockReset();
    mocks.toast.mockReset();
  });

  it('tells the user and still refreshes when the person is already gone (P0002)', async () => {
    mocks.softDelete.mockRejectedValue({ code: 'P0002', message: 'member not found' });
    const { result, invalidate } = setup();
    await result.current.mutateAsync('m1');
    expect(mocks.toast).toHaveBeenCalledWith({ variant: 'warning', message: '이미 삭제되었거나 찾을 수 없는 사람입니다.' });
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
  });

  it('rethrows other errors without a toast', async () => {
    const err = { code: '42501', message: 'not allowed' };
    mocks.softDelete.mockRejectedValue(err);
    const { result } = setup();
    await expect(result.current.mutateAsync('m1')).rejects.toBe(err);
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
