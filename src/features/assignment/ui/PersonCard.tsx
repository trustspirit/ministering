import clsx from 'clsx';
import { computeAge } from '@/features/members/domain/computeAge';
import type { Member } from '@/features/members/types';
import { GENDER_LABEL, STATUS_LABEL, T } from '@/shared/copy';
import type { AssignRole } from '../domain/board';
import { endDrag, startDrag, useDragStore } from '../dnd';
import { useWorkspaceStore } from '../store';
import { useWorkspace } from '../workspaceContext';
import { onActivateKey } from './keyboard';
import { StatusMark, StatusText } from './StatusMark';

export function PersonCard({
  member,
  role,
  onRemove,
  removeLabel = T.assign.unassign,
}: {
  member: Member;
  /** The list or zone the card sits in; becomes the drag's `from`. */
  role: AssignRole;
  onRemove?: () => void;
  /** Accessible name of the × button; defaults to unassigning. */
  removeLabel?: string;
}) {
  const { org, canEdit, householdById } = useWorkspace();
  const selected = useWorkspaceStore(
    (s) => s.selected?.kind === 'member' && s.selected.id === member.id,
  );
  const setSelected = useWorkspaceStore((s) => s.setSelected);
  // Derived from the shared drag state so any endDrag (drop, lost dragend) clears it.
  const dragging = useDragStore(
    (s) => s.item?.kind === 'member' && s.item.id === member.id && s.item.from === role,
  );
  // §9.5: the household name is shown on EQ cards only.
  const household =
    org === 'EQ' && member.household_id ? householdById.get(member.household_id) : undefined;
  const ageGender = `${computeAge(member.birth_date)}·${GENDER_LABEL[member.gender]}`;
  const label = [
    member.full_name,
    ageGender,
    member.active_status !== 'active' && STATUS_LABEL[member.active_status],
    household?.name,
  ]
    .filter(Boolean)
    .join(' ');
  const select = () => setSelected({ kind: 'member', id: member.id });

  return (
    <div
      className={clsx('aw-chip', selected && 'aw-chip--sel', dragging && 'aw-chip--dragging')}
      draggable={canEdit ? true : undefined}
      onDragStart={
        canEdit
          ? (e) => {
              startDrag(e, { kind: 'member', id: member.id, from: role });
            }
          : undefined
      }
      onDragEnd={endDrag}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onClick={select}
      onKeyDown={onActivateKey(select)}
    >
      <div className="aw-row">
        <StatusMark status={member.active_status} />
        <span className="aw-nm">{member.full_name}</span>
        <span className="aw-ag">{ageGender}</span>
        <StatusText status={member.active_status} />
        {household && <span className="aw-cnt">{household.name}</span>}
      </div>
      {canEdit && onRemove && (
        <button
          type="button"
          className="aw-x"
          aria-label={removeLabel}
          title={removeLabel}
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
