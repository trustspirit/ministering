import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from 'trust-ui-react';
import { memberRepository } from '@/repositories/MemberRepository';
import type { MemberInsert, MemberUpdate } from '@/features/members/types';
import { T } from '@/shared/copy';
import { geocodeAddress } from '@/shared/lib/geocode';
import { MEMBERS_QUERY_KEY } from './useMembers';

/** Deleting a person also drops their assignments in the database, so boards must reload too. */
const BOARD_QUERY_KEY = ['assignment-board'] as const;

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
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await memberRepository.softDelete(id);
      } catch (err) {
        // P0002: someone else already deleted this person. The goal is reached; tell the user and refresh.
        if ((err as { code?: string } | null)?.code !== 'P0002') throw err;
        toast({ variant: 'warning', message: T.memberForm.deleteMissing });
      }
    },
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY }),
        qc.invalidateQueries({ queryKey: BOARD_QUERY_KEY }),
      ]),
  });
}
