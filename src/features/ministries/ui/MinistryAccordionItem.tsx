import { useState } from 'react';
import { useMinistryDetails } from '../hooks/useMinistryDetails';
import { ministryDisplayName } from '../domain/ministryDisplayName';
import type { Ministry } from '../types';
import type { Member } from '@/features/members/types';

export interface MinistryAccordionItemProps {
  ministry: Ministry;
  allMembers: Member[];
  canEdit: boolean;
  onRemoveCompanion: (memberId: string) => void;
  onRemoveMemberRecipient: (memberId: string) => void;
}

export function MinistryAccordionItem({
  ministry,
  allMembers,
  canEdit,
  onRemoveCompanion,
  onRemoveMemberRecipient,
}: MinistryAccordionItemProps) {
  const [open, setOpen] = useState(true);
  const { data: details } = useMinistryDetails(ministry.id);
  const memberById = new Map(allMembers.map((m) => [m.id, m]));

  const companions = (details?.companionIds ?? []).map((id) => memberById.get(id)).filter(Boolean) as Member[];
  const recipients = (details?.memberRecipientIds ?? []).map((id) => memberById.get(id)).filter(Boolean) as Member[];

  return (
    <div className="border rounded mb-2 text-sm bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-3 py-2 hover:bg-slate-50"
      >
        <span className="font-medium">{ministryDisplayName(ministry)}</span>
        <span className="text-slate-400 text-xs">
          동 {companions.length} · 조 {recipients.length} {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">성역 동반자</div>
            {companions.length === 0 ? (
              <div className="text-xs text-slate-400 italic">없음</div>
            ) : (
              <ul className="space-y-1">
                {companions.map((m) => (
                  <li key={m.id} className="flex justify-between items-center text-xs bg-green-50 px-2 py-1 rounded">
                    <span>{m.full_name}</span>
                    {canEdit && (
                      <button
                        onClick={() => onRemoveCompanion(m.id)}
                        className="text-red-600 hover:underline"
                      >
                        제거
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">조원 (성역 대상)</div>
            {recipients.length === 0 ? (
              <div className="text-xs text-slate-400 italic">없음</div>
            ) : (
              <ul className="space-y-1">
                {recipients.map((m) => (
                  <li key={m.id} className="flex justify-between items-center text-xs bg-orange-50 px-2 py-1 rounded">
                    <span>{m.full_name}</span>
                    {canEdit && (
                      <button
                        onClick={() => onRemoveMemberRecipient(m.id)}
                        className="text-red-600 hover:underline"
                      >
                        제거
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
