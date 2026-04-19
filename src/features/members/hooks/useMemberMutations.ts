import { useMutation, useQueryClient } from '@tanstack/react-query';
import { memberRepository } from '@/repositories/MemberRepository';
import type { MemberInsert, MemberUpdate } from '@/features/members/types';
import { geocodeAddress } from '@/shared/lib/geocode';
import { MEMBERS_QUERY_KEY } from './useMembers';

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MemberInsert) => {
      const geo = await geocodeAddress(input.address);
      return memberRepository.create({
        ...input,
        lat: geo.lat,
        lng: geo.lng,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      previousAddress,
    }: {
      id: string;
      patch: MemberUpdate;
      previousAddress: string | null;
    }) => {
      const addressChanged = 'address' in patch && patch.address !== previousAddress;
      if (addressChanged) {
        const geo = await geocodeAddress(patch.address ?? null);
        return memberRepository.update(id, { ...patch, lat: geo.lat, lng: geo.lng });
      }
      return memberRepository.update(id, patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY }),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => memberRepository.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY }),
  });
}
