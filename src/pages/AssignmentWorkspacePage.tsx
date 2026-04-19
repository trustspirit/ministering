import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMembers } from '@/features/members/hooks/useMembers';
import { useHouseholds } from '@/features/households/hooks/useHouseholds';
import { useMemberFilterStore, filterMembers } from '@/features/members/store';
import { useAssignmentIndex } from '@/features/ministries/hooks/useAssignmentIndex';
import { AssignmentMemberListWithAssignment } from '@/features/ministries/ui/AssignmentMemberListWithAssignment';
import { AssignmentMapView } from '@/features/map/ui/AssignmentMapView';
import { MinistryPanel } from '@/features/ministries/ui/MinistryPanel';
import { AssignmentActionBar } from '@/features/ministries/ui/AssignmentActionBar';
import { usePermission } from '@/shared/auth/usePermission';
import { useRealtimeSync } from '@/shared/hooks/useRealtimeSync';
import type { Organization } from '@/features/ministries/types';

export default function AssignmentWorkspacePage() {
  const { org: orgParam } = useParams<{ org: string }>();
  const organization: Organization = orgParam === 'eq' ? 'EQ' : 'RS';

  useRealtimeSync(
    ['ministries', 'ministry_companions', 'ministry_member_recipients', 'ministry_household_recipients', 'members', 'households'],
    `assignments-${organization}`,
  );

  const { data: allMembers = [] } = useMembers();
  const { data: allHouseholds = [] } = useHouseholds();
  const filters = useMemberFilterStore();
  const perm = usePermission();
  const { data: assignmentIndex } = useAssignmentIndex(organization);

  const orgFilteredMembers = useMemo(
    () => allMembers.filter((m) => m.gender === (organization === 'RS' ? 'F' : 'M')),
    [allMembers, organization],
  );

  const filtered = useMemo(
    () => filterMembers(orgFilteredMembers, filters),
    [orgFilteredMembers, filters.search, filters.gender, filters.activeStatus, filters.personality],
  );

  const canEdit = organization === 'RS' ? perm.canEditRS : perm.canEditEQ;
  const genderLabel = organization === 'RS' ? '자매' : '형제';

  return (
    <>
      <div className="grid grid-cols-[260px_1fr_300px] gap-4 h-[calc(100vh-140px)]">
        <div className="border rounded p-3 overflow-hidden flex flex-col">
          <div className="mb-2">
            <input
              value={filters.search}
              onChange={(e) => filters.setSearch(e.target.value)}
              placeholder="이름 검색..."
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="text-xs text-slate-500 mb-2">
            {genderLabel} {filtered.length} / {orgFilteredMembers.length} · 동반자 후보
          </div>
          <AssignmentMemberListWithAssignment
            members={filtered}
            assignmentIndex={assignmentIndex ?? { byMember: {}, byHousehold: {} }}
          />
        </div>

        <div className="border rounded overflow-hidden">
          <AssignmentMapView
            members={filtered}
            households={organization === 'EQ' ? allHouseholds : undefined}
            showHouseholds={organization === 'EQ'}
            assignmentIndex={assignmentIndex ?? { byMember: {}, byHousehold: {} }}
          />
        </div>

        <div className="border rounded p-3 overflow-y-auto">
          <MinistryPanel
            organization={organization}
            allMembers={allMembers}
            allHouseholds={organization === 'EQ' ? allHouseholds : undefined}
            canEdit={canEdit}
          />
        </div>
      </div>

      <AssignmentActionBar
        organization={organization}
        allMembers={allMembers}
        allHouseholds={allHouseholds}
        canEdit={canEdit}
      />
    </>
  );
}
