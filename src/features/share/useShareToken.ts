import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ministryRepository } from '@/repositories/MinistryRepository';

export const shareTokenKey = (ministryId: string) => ['ministry-share-token', ministryId] as const;

/** Reads a ministry's token through the role-checked RPC, only while the share dialog is open. Never cached. */
export function useShareToken(ministryId: string, enabled: boolean): UseQueryResult<string | null> {
  return useQuery({
    queryKey: shareTokenKey(ministryId),
    enabled,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    queryFn: () => ministryRepository.getShareToken(ministryId),
  });
}
