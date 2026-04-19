import { useQuery } from '@tanstack/react-query';
import { ministryRepository } from '@/repositories/MinistryRepository';

export const ministryDetailsKey = (ministryId: string) =>
  ['ministry-details', ministryId] as const;

export interface MinistryDetails {
  companionIds: string[];
  memberRecipientIds: string[];
  householdRecipientIds: string[];
}

export function useMinistryDetails(ministryId: string | null) {
  return useQuery({
    enabled: ministryId !== null,
    queryKey: ministryId ? ministryDetailsKey(ministryId) : ['ministry-details', 'none'],
    queryFn: async (): Promise<MinistryDetails> => {
      if (!ministryId) return { companionIds: [], memberRecipientIds: [], householdRecipientIds: [] };
      const [companionIds, memberRecipientIds, householdRecipientIds] = await Promise.all([
        ministryRepository.listCompanionIds(ministryId),
        ministryRepository.listMemberRecipientIds(ministryId),
        ministryRepository.listHouseholdRecipientIds(ministryId),
      ]);
      return { companionIds, memberRecipientIds, householdRecipientIds };
    },
  });
}
