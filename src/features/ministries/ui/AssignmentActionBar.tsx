import { useState } from 'react';
import { useSelectionStore } from '@/features/map/store';
import { useHouseholdSelectionStore } from '@/features/map/householdSelectionStore';
import { useMinistries } from '../hooks/useMinistries';
import { useMinistryDetails } from '../hooks/useMinistryDetails';
import { useAssignmentActions } from '../hooks/useAssignmentActions';
import type { Organization, Ministry } from '../types';
import type { Member } from '@/features/members/types';
import type { Household } from '@/features/households/types';

export interface AssignmentActionBarProps {
  organization: Organization;
  allMembers: Member[];
  allHouseholds?: Household[];
  canEdit: boolean;
}

export function AssignmentActionBar({ organization, allMembers, allHouseholds = [], canEdit }: AssignmentActionBarProps) {
  const memberStore = useSelectionStore();
  const householdStore = useHouseholdSelectionStore();
  const { data: ministries = [] } = useMinistries(organization);
  const actions = useAssignmentActions(organization);

  const [pickerMode, setPickerMode] = useState<
    | null
    | { type: 'member-companion' }
    | { type: 'member-recipient' }
    | { type: 'household-recipient' }
  >(null);
  const [busy, setBusy] = useState(false);

  const selectedMembers = allMembers.filter((m) => memberStore.selectedIds.has(m.id));
  const selectedHouseholds = allHouseholds.filter((h) => householdStore.selectedHouseholdIds.has(h.id));

  const memberCount = selectedMembers.length;
  const householdCount = selectedHouseholds.length;
  const total = memberCount + householdCount;
  if (total === 0) return null;

  const clearAll = () => {
    memberStore.clear();
    householdStore.clear();
  };

  if (!canEdit) {
    return (
      <FloatingBar>
        <Badge>{total}개 선택</Badge>
        <span className="text-xs text-slate-400 italic">읽기 전용</span>
        <CancelButton onClick={clearAll} />
      </FloatingBar>
    );
  }

  if (memberCount > 0 && householdCount > 0) {
    return (
      <FloatingBar>
        <Badge>회원 {memberCount} · 가정 {householdCount}</Badge>
        <span className="text-xs text-yellow-300">회원과 가정은 동시에 선택할 수 없습니다</span>
        <CancelButton onClick={clearAll} />
      </FloatingBar>
    );
  }

  if (memberCount > 0) {
    const onCreateNew = async () => {
      setBusy(true);
      const res = await actions.createMinistryFromCompanions(selectedMembers);
      setBusy(false);
      if (res.ok) memberStore.clear();
      else alert(`조 생성 실패: ${res.reason}`);
    };

    return (
      <>
        <FloatingBar>
          <Badge>{memberCount}명 선택</Badge>
          <span className="text-xs text-slate-300 truncate max-w-xs">
            {selectedMembers.map((m) => m.full_name).join(', ')}
          </span>
          <button onClick={onCreateNew} disabled={busy}
            className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded disabled:opacity-60">
            새 조 만들기
          </button>
          <button onClick={() => setPickerMode({ type: 'member-companion' })}
            disabled={busy || ministries.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded disabled:opacity-60">
            조에 동반자로 추가
          </button>
          {organization === 'RS' && (
            <button onClick={() => setPickerMode({ type: 'member-recipient' })}
              disabled={busy || ministries.length === 0}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded disabled:opacity-60">
              조에 조원으로 추가
            </button>
          )}
          <CancelButton onClick={clearAll} />
        </FloatingBar>

        {pickerMode && (pickerMode.type === 'member-companion' || pickerMode.type === 'member-recipient') && (
          <MemberPicker
            mode={pickerMode.type === 'member-companion' ? 'companion' : 'recipient'}
            ministries={ministries}
            selectedMembers={selectedMembers}
            allMembers={allMembers}
            onClose={() => setPickerMode(null)}
            onSuccess={() => {
              setPickerMode(null);
              memberStore.clear();
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <FloatingBar>
        <Badge>가정 {householdCount}개</Badge>
        <span className="text-xs text-slate-300 truncate max-w-xs">
          {selectedHouseholds.map((h) => h.name).join(', ')}
        </span>
        {organization === 'EQ' ? (
          <button onClick={() => setPickerMode({ type: 'household-recipient' })}
            disabled={busy || ministries.length === 0}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded disabled:opacity-60">
            조에 조원으로 추가
          </button>
        ) : (
          <span className="text-xs text-yellow-300">RS 에서는 가정 단위 조원 불가</span>
        )}
        <CancelButton onClick={clearAll} />
      </FloatingBar>

      {pickerMode?.type === 'household-recipient' && (
        <HouseholdPicker
          ministries={ministries}
          selectedHouseholds={selectedHouseholds}
          onClose={() => setPickerMode(null)}
          onSuccess={() => {
            setPickerMode(null);
            householdStore.clear();
          }}
        />
      )}
    </>
  );
}

function FloatingBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-3 z-40">
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-yellow-400 text-slate-900 font-bold text-xs px-2 py-0.5 rounded-full">
      {children}
    </div>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-slate-400 hover:text-white text-xs border border-slate-600 px-2 py-0.5 rounded"
    >
      해제
    </button>
  );
}

interface MemberPickerProps {
  mode: 'companion' | 'recipient';
  ministries: Ministry[];
  selectedMembers: Member[];
  allMembers: Member[];
  onClose: () => void;
  onSuccess: () => void;
}

function MemberPicker({ mode, ministries, selectedMembers, allMembers, onClose, onSuccess }: MemberPickerProps) {
  return (
    <PickerModal title={mode === 'companion' ? '동반자로 추가할 조 선택' : '조원으로 추가할 조 선택'} onClose={onClose}>
      {ministries.map((m) => (
        <MemberPickerItem
          key={m.id}
          ministry={m}
          mode={mode}
          selectedMembers={selectedMembers}
          allMembers={allMembers}
          onSuccess={onSuccess}
        />
      ))}
    </PickerModal>
  );
}

function MemberPickerItem({
  ministry,
  mode,
  selectedMembers,
  allMembers,
  onSuccess,
}: {
  ministry: Ministry;
  mode: 'companion' | 'recipient';
  selectedMembers: Member[];
  allMembers: Member[];
  onSuccess: () => void;
}) {
  const { data: details } = useMinistryDetails(ministry.id);
  const actions = useAssignmentActions(ministry.organization);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    const existingCompanionIds = details?.companionIds ?? [];
    const existingCompanionMembers = allMembers.filter((m) => existingCompanionIds.includes(m.id));

    let res;
    if (mode === 'companion') {
      res = await actions.addCompanionsToMinistry(ministry, selectedMembers, existingCompanionMembers);
    } else {
      res = await actions.addMemberRecipientsToMinistry(ministry, selectedMembers, {
        companionMemberIds: existingCompanionIds,
        companionHouseholdIds: details?.householdRecipientIds ?? [],
      });
    }
    setBusy(false);

    if (res.ok) onSuccess();
    else alert(res.reason);
  };

  return <PickerItem ministry={ministry} details={details} busy={busy} onClick={onClick} />;
}

interface HouseholdPickerProps {
  ministries: Ministry[];
  selectedHouseholds: Household[];
  onClose: () => void;
  onSuccess: () => void;
}

function HouseholdPicker({ ministries, selectedHouseholds, onClose, onSuccess }: HouseholdPickerProps) {
  return (
    <PickerModal title="가정 조원으로 추가할 조 선택" onClose={onClose}>
      {ministries.map((m) => (
        <HouseholdPickerItem
          key={m.id}
          ministry={m}
          selectedHouseholds={selectedHouseholds}
          onSuccess={onSuccess}
        />
      ))}
    </PickerModal>
  );
}

function HouseholdPickerItem({
  ministry,
  selectedHouseholds,
  onSuccess,
}: {
  ministry: Ministry;
  selectedHouseholds: Household[];
  onSuccess: () => void;
}) {
  const { data: details } = useMinistryDetails(ministry.id);
  const actions = useAssignmentActions(ministry.organization);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    const res = await actions.addHouseholdRecipientsToMinistry(ministry, selectedHouseholds, {
      companionMemberIds: details?.companionIds ?? [],
      companionHouseholdIds: details?.householdRecipientIds ?? [],
    });
    setBusy(false);

    if (res.ok) onSuccess();
    else alert(res.reason);
  };

  return <PickerItem ministry={ministry} details={details} busy={busy} onClick={onClick} />;
}

function PickerModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 space-y-3">
        <h3 className="font-semibold">{title}</h3>
        <div className="space-y-1 max-h-80 overflow-y-auto">{children}</div>
        <div className="flex justify-end">
          <button onClick={onClose} className="text-slate-600 px-3 py-1.5 text-sm">취소</button>
        </div>
      </div>
    </div>
  );
}

function PickerItem({
  ministry,
  details,
  busy,
  onClick,
}: {
  ministry: Ministry;
  details?: { companionIds: string[] };
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded flex justify-between items-center disabled:opacity-50"
    >
      <span className="text-sm">{ministry.name ?? `조 ${ministry.number}`}</span>
      <span className="text-xs text-slate-400">
        동 {details?.companionIds.length ?? 0}
      </span>
    </button>
  );
}
