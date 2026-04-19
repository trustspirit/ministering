import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ministryRepository } from '@/repositories/MinistryRepository';
import { nextMinistryNumber } from '../domain/nextMinistryNumber';
import type { Organization } from '../types';
import { ministriesKey } from './useMinistries';
import { ministryDetailsKey } from './useMinistryDetails';

export function useCreateMinistry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ organization }: { organization: Organization }) => {
      const numbers = await ministryRepository.getExistingNumbers(organization);
      const number = nextMinistryNumber(numbers);
      return ministryRepository.create({ organization, number });
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ministriesKey(vars.organization) }),
  });
}

export function useUpdateMinistryName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string | null; organization: Organization }) =>
      ministryRepository.update(id, { name }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ministriesKey(vars.organization) }),
  });
}

export function useDeleteMinistry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; organization: Organization }) =>
      ministryRepository.remove(id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ministriesKey(vars.organization) });
      qc.invalidateQueries({ queryKey: ['assignment-index'] });
    },
  });
}

export function useAddCompanion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ministryId, memberId }: { ministryId: string; memberId: string }) =>
      ministryRepository.addCompanion(ministryId, memberId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ministryDetailsKey(vars.ministryId) });
      qc.invalidateQueries({ queryKey: ['assignment-index'] });
    },
  });
}

export function useRemoveCompanion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ministryId, memberId }: { ministryId: string; memberId: string }) =>
      ministryRepository.removeCompanion(ministryId, memberId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ministryDetailsKey(vars.ministryId) });
      qc.invalidateQueries({ queryKey: ['assignment-index'] });
    },
  });
}

export function useAddMemberRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ministryId, memberId }: { ministryId: string; memberId: string }) =>
      ministryRepository.addMemberRecipient(ministryId, memberId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ministryDetailsKey(vars.ministryId) });
      qc.invalidateQueries({ queryKey: ['assignment-index'] });
    },
  });
}

export function useRemoveMemberRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ministryId, memberId }: { ministryId: string; memberId: string }) =>
      ministryRepository.removeMemberRecipient(ministryId, memberId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ministryDetailsKey(vars.ministryId) });
      qc.invalidateQueries({ queryKey: ['assignment-index'] });
    },
  });
}
