import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import type { Organization } from '@/features/ministries/types';
import type { Board } from '../domain/board';

export const assignmentBoardKey = (org: Organization) => ['assignment-board', org] as const;

function group(rows: { ministry_id: string; id: string }[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const r of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
    const list = map.get(r.ministry_id);
    if (list) list.push(r.id);
    else map.set(r.ministry_id, [r.id]);
  }
  return map;
}

export function useAssignmentBoard(org: Organization): UseQueryResult<Board> {
  return useQuery({
    queryKey: assignmentBoardKey(org),
    queryFn: async (): Promise<Board> => {
      const [ministryRes, presidencyRes, poolRes] = await Promise.all([
        supabase
          .from('ministries')
          .select('id, number, name, supervisor_member_id')
          .eq('organization', org)
          .order('number'),
        supabase.from('presidency_members').select('member_id').eq('organization', org),
        supabase.from('ministry_pool').select('role, member_id, household_id').eq('organization', org),
      ]);
      if (ministryRes.error) throw ministryRes.error;
      if (presidencyRes.error) throw presidencyRes.error;
      if (poolRes.error) throw poolRes.error;
      const ministries = ministryRes.data;
      const presidencyIds = (presidencyRes.data ?? []).map((r) => r.member_id).sort();
      const poolRows = poolRes.data ?? [];
      const poolIds = (role: 'companion' | 'recipient') =>
        poolRows
          .filter((r) => r.role === role)
          .map((r) => (r.member_id ?? r.household_id) as string)
          .sort();
      const pool = { companionIds: poolIds('companion'), recipientIds: poolIds('recipient') };
      const ids = (ministries ?? []).map((m) => m.id);
      if (ids.length === 0) return { organization: org, presidencyIds, pool, ministries: [] };

      const [companions, recipients] = await Promise.all([
        supabase.from('ministry_companions').select('ministry_id, member_id').in('ministry_id', ids),
        org === 'EQ'
          ? supabase
              .from('ministry_household_recipients')
              .select('ministry_id, household_id')
              .in('ministry_id', ids)
          : supabase
              .from('ministry_member_recipients')
              .select('ministry_id, member_id')
              .in('ministry_id', ids),
      ]);
      if (companions.error) throw companions.error;
      if (recipients.error) throw recipients.error;

      const companionMap = group(
        (companions.data ?? []).map((r) => ({ ministry_id: r.ministry_id, id: r.member_id })),
      );
      const recipientMap = group(
        (recipients.data ?? []).map((r) => ({
          ministry_id: r.ministry_id,
          id: 'household_id' in r ? r.household_id : r.member_id,
        })),
      );

      return {
        organization: org,
        presidencyIds,
        pool,
        ministries: (ministries ?? []).map((m) => ({
          id: m.id,
          number: m.number,
          name: m.name,
          supervisorId: m.supervisor_member_id,
          companionIds: companionMap.get(m.id) ?? [],
          recipientIds: recipientMap.get(m.id) ?? [],
        })),
      };
    },
  });
}
