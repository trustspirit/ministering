import { useState } from 'react';
import clsx from 'clsx';
import type { Household } from '@/features/households/types';
import { computeAge } from '@/features/members/domain/computeAge';
import type { Member } from '@/features/members/types';
import { GENDER_LABEL, T } from '@/shared/copy';
import { sortFamily } from '../domain/familyOrder';
import { endDrag, startDrag } from '../dnd';
import { useWorkspaceStore } from '../store';
import { useWorkspace } from '../workspaceContext';
import { StatusMark, StatusText } from './StatusMark';

export function HouseholdCard({
  household,
  members,
  onRemove,
}: {
  household: Household;
  /** The household's members, in any order. */
  members: Member[];
  onRemove?: () => void;
}) {
  const { canEdit } = useWorkspace();
  const selected = useWorkspaceStore(
    (s) => s.selected?.kind === 'household' && s.selected.id === household.id,
  );
  const setSelected = useWorkspaceStore((s) => s.setSelected);
  const [dragging, setDragging] = useState(false);
  const family = sortFamily(members);

  return (
    <div
      className={clsx('aw-chip', selected && 'aw-chip--sel', dragging && 'aw-chip--dragging')}
      draggable={canEdit ? true : undefined}
      onDragStart={
        canEdit
          ? (e) => {
              startDrag(e, { kind: 'household', id: household.id, from: 'recipient' });
              setDragging(true);
            }
          : undefined
      }
      onDragEnd={() => {
        setDragging(false);
        endDrag();
      }}
      onClick={() => setSelected({ kind: 'household', id: household.id })}
    >
      <div className="aw-row">
        <span className="aw-nm">{household.name}</span>
        <span className="aw-cnt">{T.assign.headcount(family.length)}</span>
      </div>
      {family.length > 0 && (
        <ul className="aw-fam" aria-label={T.assign.familyLabel}>
          {family.map((m) => (
            <li key={m.id}>
              <StatusMark status={m.active_status} />
              {m.full_name}{' '}
              <i>
                {computeAge(m.birth_date)}·{GENDER_LABEL[m.gender]}
              </i>
              <StatusText status={m.active_status} />
            </li>
          ))}
        </ul>
      )}
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
