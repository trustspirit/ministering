import { useSelectionStore } from '../store';
import type { Member } from '@/features/members/types';

export interface SelectionBarProps {
  allMembers: Member[];
}

export function SelectionBar({ allMembers }: SelectionBarProps) {
  const { selectedIds, clear } = useSelectionStore();

  if (selectedIds.size === 0) return null;

  const memberById = new Map(allMembers.map((m) => [m.id, m]));
  const names = Array.from(selectedIds)
    .map((id) => memberById.get(id)?.full_name)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-3 max-w-2xl z-40">
      <div className="bg-yellow-400 text-slate-900 font-bold text-xs px-2 py-0.5 rounded-full">
        {selectedIds.size}명 선택
      </div>
      <div className="text-xs text-slate-300 truncate max-w-sm">{names}</div>
      <button
        onClick={clear}
        className="text-slate-400 hover:text-white text-xs border border-slate-600 px-2 py-0.5 rounded"
      >
        해제
      </button>
      <div className="text-xs text-slate-500 italic">(편성 기능은 Plan 6)</div>
    </div>
  );
}
