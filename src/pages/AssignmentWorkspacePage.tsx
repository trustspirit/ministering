import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMembers } from '@/features/members/hooks/useMembers';
import { useMemberFilterStore, filterMembers } from '@/features/members/store';
import { useAssignmentIndex } from '@/features/ministries/hooks/useAssignmentIndex';
import { AssignmentMemberListWithAssignment } from '@/features/ministries/ui/AssignmentMemberListWithAssignment';
import { AssignmentMapView } from '@/features/map/ui/AssignmentMapView';
import { MinistryPanel } from '@/features/ministries/ui/MinistryPanel';
import { AssignmentActionBar } from '@/features/ministries/ui/AssignmentActionBar';
import { usePermission } from '@/shared/auth/usePermission';
import type { Organization } from '@/features/ministries/types';

export default function AssignmentWorkspacePage() {
  const { org: orgParam } = useParams<{ org: string }>();
  const organization: Organization = orgParam === 'eq' ? 'EQ' : 'RS';

  const { data: allMembers = [] } = useMembers();
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

  if (organization === 'EQ') {
    return (
      <div className="py-12 text-center text-slate-500">
        EQ 편성 작업공간은 <strong>Plan 7</strong> 에서 구현됩니다.<br />
        현재는 RS 편성만 동작합니다.
      </div>
    );
  }

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
            자매 {filtered.length} / {orgFilteredMembers.length} · 선택 가능
          </div>
          <AssignmentMemberListWithAssignment
            members={filtered}
            assignmentIndex={assignmentIndex ?? { byMember: {}, byHousehold: {} }}
          />
        </div>

        <div className="border rounded overflow-hidden">
          <AssignmentMapView
            members={filtered}
            assignmentIndex={assignmentIndex ?? { byMember: {}, byHousehold: {} }}
          />
        </div>

        <div className="border rounded p-3 overflow-y-auto">
          <MinistryPanel
            organization={organization}
            allMembers={allMembers}
            canEdit={canEdit}
          />
        </div>
      </div>

      <AssignmentActionBar
        organization={organization}
        allMembers={allMembers}
        canEdit={canEdit}
      />
    </>
  );
}
