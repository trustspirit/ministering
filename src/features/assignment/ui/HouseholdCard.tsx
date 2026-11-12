import clsx from 'clsx';
import type { Household } from '@/features/households/types';
import { computeAge } from '@/features/members/domain/computeAge';
import type { Member } from '@/features/members/types';
import { GENDER_LABEL, STATUS_LABEL, T } from '@/shared/copy';
import { sortFamily } from '../domain/familyOrder';
import { endDrag, startDrag, useDragStore } from '../dnd';
import { useWorkspaceStore } from '../store';
import { useWorkspace } from '../workspaceContext';
import { onActivateKey } from './keyboard';
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
  // Derived from the shared drag state so any endDrag (drop, lost dragend) clears it.
  const dragging = useDragStore(
    (s) => s.item?.kind === 'household' && s.item.id === household.id && s.item.from === 'recipient',
  );
  const family = sortFamily(members);
  const select = () => setSelected({ kind: 'household', id: household.id });
  // role="button" makes the content presentational, so the family goes into the name.
  const label = [
    `${household.name} ${T.assign.headcount(family.length)}`,
    ...family.map((m) =>
      [
        m.full_name,
        `${computeAge(m.birth_date)}·${GENDER_LABEL[m.gender]}`,
        m.active_status !== 'active' && STATUS_LABEL[m.active_status],
      ]
        .filter(Boolean)
        .join(' '),
    ),
  ].join(', ');

  return (
    <div
      className={clsx('aw-chip', selected && 'aw-chip--sel', dragging && 'aw-chip--dragging')}
      draggable={canEdit ? true : undefined}
      onDragStart={
        canEdit
          ? (e) => {
              startDrag(e, { kind: 'household', id: household.id, from: 'recipient' });
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
