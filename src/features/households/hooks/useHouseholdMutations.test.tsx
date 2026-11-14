import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  update: vi.fn(async () => ({})),
  create: vi.fn(async () => ({ id: 'h-new' })),
  geocode: vi.fn(async () => ({ lat: 1, lng: 2, status: 'ok' })),
}));
vi.mock('@/repositories/HouseholdRepository', () => ({
  householdRepository: { update: mocks.update, create: mocks.create },
}));
vi.mock('@/shared/lib/geocode', () => ({ geocodeAddress: mocks.geocode }));

import { useCreateHousehold, useUpdateHousehold } from './useHouseholdMutations';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('household mutations', () => {
  beforeEach(() => {
    mocks.update.mockClear();
    mocks.create.mockClear();
    mocks.geocode.mockClear();
  });

  it('keeps the coordinates of an address picked from the Kakao search', async () => {
    const { result } = renderHook(() => useUpdateHousehold(), { wrapper });
    await result.current.mutateAsync({
      id: 'h1',
      patch: { address: '서울 강동구 상일로 55 111동', lat: 37.55, lng: 127.16 },
      previousAddress: '서울 성동구 금호로 100',
    });
    expect(mocks.geocode).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith('h1', { address: '서울 강동구 상일로 55 111동', lat: 37.55, lng: 127.16 });
  });

  it('still geocodes a changed address that came without coordinates', async () => {
    const { result } = renderHook(() => useUpdateHousehold(), { wrapper });
    await result.current.mutateAsync({ id: 'h1', patch: { address: '서울 어딘가' }, previousAddress: null });
    expect(mocks.geocode).toHaveBeenCalledWith('서울 어딘가');
    expect(mocks.update).toHaveBeenCalledWith('h1', { address: '서울 어딘가', lat: 1, lng: 2 });
  });

  it('creates a household with the picked coordinates as given', async () => {
    const { result } = renderHook(() => useCreateHousehold(), { wrapper });
    await result.current.mutateAsync({ address: '서울 강동구 상일로 55', lat: 37.55, lng: 127.16 });
    expect(mocks.geocode).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledWith({ address: '서울 강동구 상일로 55', lat: 37.55, lng: 127.16 });
  });
});
