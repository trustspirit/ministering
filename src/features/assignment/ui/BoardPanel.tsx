import clsx from 'clsx';
import { T } from '@/shared/copy';
import { dragOf, overKey, useDragStore, useDropHandler } from '../dnd';
import { useWorkspace } from '../workspaceContext';
import { MinistryCard } from './MinistryCard';

export function BoardPanel() {
  const { org, board, canEdit } = useWorkspace();
  const over = useDragStore((s) => s.over === overKey.newMinistry);
  const setOver = useDragStore((s) => s.setOver);
  const handleDrop = useDropHandler(org);

  return (
    <section className="aw-board">
      <div className="aw-grid">
        {board.ministries.map((m) => (
          <MinistryCard key={m.id} ministry={m} org={org} canEdit={canEdit} />
        ))}
        {canEdit && (
          <div
            className={clsx('aw-newg', over && 'aw-newg--over')}
            onDragOver={(e) => {
              if (!dragOf(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setOver(overKey.newMinistry);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(e, { type: 'new' });
            }}
          >
            <div>
              {T.assign.newMinistry}
              <br />
              <small>{T.assign.newMinistryHint}</small>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
