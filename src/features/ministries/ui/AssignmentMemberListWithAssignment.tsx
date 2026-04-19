import { Badge } from '@/shared/ui/Badge';
import { computeAge } from '@/features/members/domain/computeAge';
import { useSelectionStore } from '@/features/map/store';
import type { Member } from '@/features/members/types';
import type { AssignmentIndex } from '../hooks/useAssignmentIndex';

export interface Props {
  members: Member[];
  assignmentIndex: AssignmentIndex;
}

export function AssignmentMemberListWithAssignment({ members, assignmentIndex }: Props) {
  const { selectedIds, toggle } = useSelectionStore();

  return (
    <div className="space-y-1 overflow-y-auto">
      {members.map((m) => {
        const assignment = assignmentIndex.byMember[m.id];
        const isSelected = selectedIds.has(m.id);
        return (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
              isSelected ? 'bg-yellow-100' : 'hover:bg-slate-50'
            } ${m.active_status === 'less_active' ? 'opacity-60' : ''}`}
          >
            <span className="text-xs text-slate-500 w-6">{m.gender === 'M' ? '남' : '여'}</span>
            <span className="flex-1 truncate">{m.full_name}</span>
            <span className="text-xs text-slate-400">{computeAge(m.birth_date)}</span>
            {assignment && (
              <Badge tone={assignment.role === 'companion' ? 'green' : 'orange'}>
                {assignment.role === 'companion' ? `동${assignment.ministryNumber}` : `조${assignment.ministryNumber}`}
              </Badge>
            )}
          </button>
        );
      })}
      {members.length === 0 && (
        <div className="text-xs text-slate-400 italic py-4 text-center">회원 없음</div>
      )}
    </div>
  );
}
