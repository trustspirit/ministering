import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdRepository } from '@/repositories/HouseholdRepository';
import { geocodeAddress } from '@/shared/lib/geocode';
import type { HouseholdUpdate } from '@/features/households/types';
import { HOUSEHOLDS_QUERY_KEY } from './useHouseholds';
import { MEMBERS_QUERY_KEY } from '@/features/members/hooks/useMembers';

export function useUpdateHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      previousAddress,
    }: {
      id: string;
      patch: HouseholdUpdate;
      previousAddress: string | null;
    }) => {
      const addressChanged = 'address' in patch && patch.address !== previousAddress;
      if (addressChanged) {
        const geo = await geocodeAddress(patch.address ?? null);
        return householdRepository.update(id, { ...patch, lat: geo.lat, lng: geo.lng });
      }
      return householdRepository.update(id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOUSEHOLDS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
    },
  });
}
