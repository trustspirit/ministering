import { useState } from 'react';
import { useSelectionStore } from '@/features/map/store';
import { useMinistries } from '../hooks/useMinistries';
import { useMinistryDetails } from '../hooks/useMinistryDetails';
import { useAssignmentActions } from '../hooks/useAssignmentActions';
import type { Organization, Ministry } from '../types';
import type { Member } from '@/features/members/types';

export interface AssignmentActionBarProps {
  organization: Organization;
  allMembers: Member[];
  canEdit: boolean;
}

export function AssignmentActionBar({ organization, allMembers, canEdit }: AssignmentActionBarProps) {
  const { selectedIds, clear } = useSelectionStore();
  const { data: ministries = [] } = useMinistries(organization);
  const actions = useAssignmentActions(organization);
  const [pickerMode, setPickerMode] = useState<'companion' | 'recipient' | null>(null);
  const [busy, setBusy] = useState(false);

  if (selectedIds.size === 0) return null;

  const selectedMembers = allMembers.filter((m) => selectedIds.has(m.id));

  if (!canEdit) {
    return (
      <FloatingBar>
        <Badge>{selectedIds.size}명 선택</Badge>
        <span className="text-xs text-slate-400 italic">읽기 전용</span>
        <CancelButton onClick={clear} />
      </FloatingBar>
    );
  }

  const onCreateNew = async () => {
    setBusy(true);
    const res = await actions.createMinistryFromCompanions(selectedMembers);
    setBusy(false);
    if (res.ok) {
      clear();
    } else {
      alert(`조 생성 실패: ${res.reason}`);
    }
  };

  return (
    <>
      <FloatingBar>
        <Badge>{selectedIds.size}명 선택</Badge>
        <span className="text-xs text-slate-300 truncate max-w-xs">
          {selectedMembers.map((m) => m.full_name).join(', ')}
        </span>
        <button
          onClick={onCreateNew}
          disabled={busy}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded disabled:opacity-60"
        >
          새 조 만들기
        </button>
        <button
          onClick={() => setPickerMode('companion')}
          disabled={busy || ministries.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded disabled:opacity-60"
        >
          조에 동반자로 추가
        </button>
        <button
          onClick={() => setPickerMode('recipient')}
          disabled={busy || ministries.length === 0}
          className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded disabled:opacity-60"
        >
          조에 조원으로 추가
        </button>
        <CancelButton onClick={clear} />
      </FloatingBar>

      {pickerMode && (
        <MinistryPicker
          mode={pickerMode}
          ministries={ministries}
          selectedMembers={selectedMembers}
          allMembers={allMembers}
          onClose={() => setPickerMode(null)}
          onSuccess={() => {
            setPickerMode(null);
            clear();
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

interface MinistryPickerProps {
  mode: 'companion' | 'recipient';
  ministries: Ministry[];
  selectedMembers: Member[];
  allMembers: Member[];
  onClose: () => void;
  onSuccess: () => void;
}

function MinistryPicker({ mode, ministries, selectedMembers, allMembers, onClose, onSuccess }: MinistryPickerProps) {
  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 space-y-3">
        <h3 className="font-semibold">
          {mode === 'companion' ? '동반자로 추가할 조 선택' : '조원으로 추가할 조 선택'}
        </h3>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {ministries.map((m) => (
            <MinistryPickerItem
              key={m.id}
              ministry={m}
              mode={mode}
              selectedMembers={selectedMembers}
              allMembers={allMembers}
              onSuccess={onSuccess}
            />
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="text-slate-600 px-3 py-1.5 text-sm">취소</button>
        </div>
      </div>
    </div>
  );
}

function MinistryPickerItem({
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

    if (res.ok) {
      onSuccess();
    } else {
      alert(res.reason);
    }
  };

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
