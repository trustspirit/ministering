import { useQuery } from '@tanstack/react-query';
import { householdRepository } from '@/repositories/HouseholdRepository';

export const HOUSEHOLDS_QUERY_KEY = ['households'] as const;

export function useHouseholds() {
  return useQuery({
    queryKey: HOUSEHOLDS_QUERY_KEY,
    queryFn: () => householdRepository.list(),
  });
}
