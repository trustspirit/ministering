import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from 'trust-ui-react';
import { memberRepository } from '@/repositories/MemberRepository';
import type { MemberInsert, MemberUpdate } from '@/features/members/types';
import { T } from '@/shared/copy';
import { HOUSEHOLDS_QUERY_KEY } from '@/features/households/hooks/useHouseholds';
import { MEMBERS_QUERY_KEY } from './useMembers';

/** Deleting a person also drops their assignments in the database, so boards must reload too. */
const BOARD_QUERY_KEY = ['assignment-board'] as const;

/** Household names are derived from their members, so the household list reloads with the members. */
function refreshAfterMemberChange(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY }),
    qc.invalidateQueries({ queryKey: HOUSEHOLDS_QUERY_KEY }),
  ]);
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberInsert) => memberRepository.create(input),
    onSuccess: () => refreshAfterMemberChange(qc),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MemberUpdate }) => memberRepository.update(id, patch),
    onSuccess: () => refreshAfterMemberChange(qc),
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
    onSuccess: () => Promise.all([refreshAfterMemberChange(qc), qc.invalidateQueries({ queryKey: BOARD_QUERY_KEY })]),
  });
}
