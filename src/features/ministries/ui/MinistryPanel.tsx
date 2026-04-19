import { useMinistries } from '../hooks/useMinistries';
import { useAssignmentActions } from '../hooks/useAssignmentActions';
import { MinistryAccordionItem } from './MinistryAccordionItem';
import type { Organization } from '../types';
import type { Member } from '@/features/members/types';
import type { Household } from '@/features/households/types';

export interface MinistryPanelProps {
  organization: Organization;
  allMembers: Member[];
  allHouseholds?: Household[];
  canEdit: boolean;
}

export function MinistryPanel({ organization, allMembers, allHouseholds, canEdit }: MinistryPanelProps) {
  const { data: ministries = [], isLoading } = useMinistries(organization);
  const actions = useAssignmentActions(organization);

  const handleRemoveCompanion = async (ministryId: string, memberId: string) => {
    const res = await actions.removeCompanion(ministryId, memberId);
    if (!res.ok) alert(res.reason);
  };

  const handleRemoveRecipient = async (ministryId: string, memberId: string) => {
    const res = await actions.removeMemberRecipient(ministryId, memberId);
    if (!res.ok) alert(res.reason);
  };

  const handleRemoveHouseholdRecipient = async (ministryId: string, householdId: string) => {
    const res = await actions.removeHouseholdRecipient(ministryId, householdId);
    if (!res.ok) alert(res.reason);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">조 목록</h3>
      {isLoading ? (
        <div className="text-xs text-slate-500">불러오는 중...</div>
      ) : ministries.length === 0 ? (
        <div className="text-xs text-slate-500 italic py-4">아직 편성된 조가 없습니다.<br />회원을 선택하고 "새 조 만들기" 하세요.</div>
      ) : (
        ministries.map((m) => (
          <MinistryAccordionItem
            key={m.id}
            ministry={m}
            allMembers={allMembers}
            allHouseholds={allHouseholds}
            canEdit={canEdit}
            onRemoveCompanion={(memberId) => handleRemoveCompanion(m.id, memberId)}
            onRemoveMemberRecipient={(memberId) => handleRemoveRecipient(m.id, memberId)}
            onRemoveHouseholdRecipient={(householdId) => handleRemoveHouseholdRecipient(m.id, householdId)}
          />
        ))
      )}
    </div>
  );
}
