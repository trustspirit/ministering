import type { Member } from '@/features/members/types';
import type { Household } from '@/features/households/types';

export interface DashboardInputs {
  members: Member[];
  households: Household[];
  rsMinistryCount: number;
  eqMinistryCount: number;
  rsRecipientMemberIds: Set<string>;
  eqRecipientHouseholdIds: Set<string>;
}

export interface DashboardMetrics {
  rsMinistryCount: number;
  eqMinistryCount: number;
  totalMembers: number;
  activeMembersPct: number;
  totalSisterCount: number;
  unassignedSisterCount: number;
  totalHouseholdCount: number;
  unassignedHouseholdCount: number;
}

export function computeDashboardMetrics(input: DashboardInputs): DashboardMetrics {
  const totalMembers = input.members.length;
  const activeCount = input.members.filter((m) => m.active_status === 'active').length;
  const activeMembersPct = totalMembers === 0 ? 0 : Math.round((activeCount / totalMembers) * 100);

  const sisters = input.members.filter((m) => m.gender === 'F');
  const totalSisterCount = sisters.length;
  const unassignedSisterCount = sisters.filter((s) => !input.rsRecipientMemberIds.has(s.id)).length;

  const totalHouseholdCount = input.households.length;
  const unassignedHouseholdCount = input.households.filter(
    (h) => !input.eqRecipientHouseholdIds.has(h.id),
  ).length;

  return {
    rsMinistryCount: input.rsMinistryCount,
    eqMinistryCount: input.eqMinistryCount,
    totalMembers,
    activeMembersPct,
    totalSisterCount,
    unassignedSisterCount,
    totalHouseholdCount,
    unassignedHouseholdCount,
  };
}
