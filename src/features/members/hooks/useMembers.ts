import { useQuery } from '@tanstack/react-query';
import { memberRepository } from '@/repositories/MemberRepository';

export const MEMBERS_QUERY_KEY = ['members', 'active'] as const;

export function useMembers() {
  return useQuery({
    queryKey: MEMBERS_QUERY_KEY,
    queryFn: () => memberRepository.listActive(),
  });
}
