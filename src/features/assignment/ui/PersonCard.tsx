import { useState } from 'react';
import clsx from 'clsx';
import { computeAge } from '@/features/members/domain/computeAge';
import type { Member } from '@/features/members/types';
import { GENDER_LABEL, T } from '@/shared/copy';
import type { AssignRole } from '../domain/board';
import { endDrag, startDrag } from '../dnd';
import { useWorkspaceStore } from '../store';
import { useWorkspace } from '../workspaceContext';
import { StatusMark, StatusText } from './StatusMark';

export function PersonCard({
  member,
  role,
  onRemove,
}: {
  member: Member;
  /** The list or zone the card sits in; becomes the drag's `from`. */
  role: AssignRole;
  onRemove?: () => void;
}) {
  const { org, canEdit, householdById } = useWorkspace();
  const selected = useWorkspaceStore(
    (s) => s.selected?.kind === 'member' && s.selected.id === member.id,
  );
  const setSelected = useWorkspaceStore((s) => s.setSelected);
  const [dragging, setDragging] = useState(false);
  // §9.5: the household name is shown on EQ cards only.
  const household =
    org === 'EQ' && member.household_id ? householdById.get(member.household_id) : undefined;

  return (
    <div
      className={clsx('aw-chip', selected && 'aw-chip--sel', dragging && 'aw-chip--dragging')}
      draggable={canEdit ? true : undefined}
      onDragStart={
        canEdit
          ? (e) => {
              startDrag(e, { kind: 'member', id: member.id, from: role });
              setDragging(true);
            }
          : undefined
      }
      onDragEnd={() => {
        setDragging(false);
        endDrag();
      }}
      onClick={() => setSelected({ kind: 'member', id: member.id })}
    >
      <div className="aw-row">
        <StatusMark status={member.active_status} />
        <span className="aw-nm">{member.full_name}</span>
        <span className="aw-ag">
          {computeAge(member.birth_date)}·{GENDER_LABEL[member.gender]}
        </span>
        <StatusText status={member.active_status} />
        {household && <span className="aw-cnt">{household.name}</span>}
      </div>
      {canEdit && onRemove && (
        <button
          type="button"
          className="aw-x"
          aria-label={T.assign.unassign}
          title={T.assign.unassign}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
