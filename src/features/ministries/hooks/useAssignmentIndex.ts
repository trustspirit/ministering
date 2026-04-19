import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import type { Organization } from '../types';

export type AssignmentRole = 'companion' | 'recipient';

export interface AssignmentInfo {
  ministryId: string;
  ministryNumber: number;
  role: AssignmentRole;
}

export interface AssignmentIndex {
  byMember: Record<string, AssignmentInfo>;
  byHousehold: Record<string, AssignmentInfo>;
}

export const assignmentIndexKey = (org: Organization) =>
  ['assignment-index', org] as const;

export function useAssignmentIndex(org: Organization) {
  return useQuery({
    queryKey: assignmentIndexKey(org),
    queryFn: async (): Promise<AssignmentIndex> => {
      const { data: ministries, error: mErr } = await supabase
        .from('ministries')
        .select('id, number')
        .eq('organization', org);
      if (mErr) throw mErr;

      const ministryIds = (ministries ?? []).map((m) => m.id);
      const numberById = Object.fromEntries((ministries ?? []).map((m) => [m.id, m.number]));

      if (ministryIds.length === 0) return { byMember: {}, byHousehold: {} };

      const [{ data: companions }, { data: memberRecipients }, { data: householdRecipients }] = await Promise.all([
        supabase.from('ministry_companions').select('ministry_id, member_id').in('ministry_id', ministryIds),
        supabase.from('ministry_member_recipients').select('ministry_id, member_id').in('ministry_id', ministryIds),
        supabase.from('ministry_household_recipients').select('ministry_id, household_id').in('ministry_id', ministryIds),
      ]);

      const byMember: Record<string, AssignmentInfo> = {};
      for (const row of companions ?? []) {
        byMember[row.member_id] = {
          ministryId: row.ministry_id,
          ministryNumber: numberById[row.ministry_id],
          role: 'companion',
        };
      }
      for (const row of memberRecipients ?? []) {
        if (!byMember[row.member_id]) {
          byMember[row.member_id] = {
            ministryId: row.ministry_id,
            ministryNumber: numberById[row.ministry_id],
            role: 'recipient',
          };
        }
      }

      const byHousehold: Record<string, AssignmentInfo> = {};
      for (const row of householdRecipients ?? []) {
        byHousehold[row.household_id] = {
          ministryId: row.ministry_id,
          ministryNumber: numberById[row.ministry_id],
          role: 'recipient',
        };
      }

      return { byMember, byHousehold };
    },
  });
}
