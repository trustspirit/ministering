import { useMembers } from '@/features/members/hooks/useMembers';
import { useHouseholds } from '@/features/households/hooks/useHouseholds';
import { useMinistries } from '@/features/ministries/hooks/useMinistries';
import { useAssignmentIndex } from '@/features/ministries/hooks/useAssignmentIndex';
import { computeDashboardMetrics, type DashboardMetrics } from '../domain/computeDashboardMetrics';

export function useDashboardData(): {
  metrics: DashboardMetrics;
  loading: boolean;
} {
  const members = useMembers();
  const households = useHouseholds();
  const rsMinistries = useMinistries('RS');
  const eqMinistries = useMinistries('EQ');
  const rsIndex = useAssignmentIndex('RS');
  const eqIndex = useAssignmentIndex('EQ');

  const loading =
    members.isLoading ||
    households.isLoading ||
    rsMinistries.isLoading ||
    eqMinistries.isLoading ||
    rsIndex.isLoading ||
    eqIndex.isLoading;

  const rsRecipientMemberIds = new Set<string>();
  if (rsIndex.data) {
    for (const [memberId, info] of Object.entries(rsIndex.data.byMember)) {
      if (info.role === 'recipient') rsRecipientMemberIds.add(memberId);
    }
  }

  const eqRecipientHouseholdIds = new Set<string>(
    Object.keys(eqIndex.data?.byHousehold ?? {}),
  );

  const metrics = computeDashboardMetrics({
    members: members.data ?? [],
    households: households.data ?? [],
    rsMinistryCount: rsMinistries.data?.length ?? 0,
    eqMinistryCount: eqMinistries.data?.length ?? 0,
    rsRecipientMemberIds,
    eqRecipientHouseholdIds,
  });

  return { metrics, loading };
}
