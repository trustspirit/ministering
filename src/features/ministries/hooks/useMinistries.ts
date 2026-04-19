import { useQuery } from '@tanstack/react-query';
import { ministryRepository } from '@/repositories/MinistryRepository';
import type { Organization } from '../types';

export const ministriesKey = (org: Organization) => ['ministries', org] as const;

export function useMinistries(org: Organization) {
  return useQuery({
    queryKey: ministriesKey(org),
    queryFn: () => ministryRepository.listByOrganization(org),
  });
}
