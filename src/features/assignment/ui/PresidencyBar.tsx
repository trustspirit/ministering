import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { T } from '@/shared/copy';
import { supervisionCounts } from '../domain/board';
import { useWorkspaceStore, type SupervisorFilter } from '../store';
import { useWorkspace } from '../workspaceContext';
import { PresidencyDialog } from './PresidencyDialog';

/** The organization's presidency as filter chips ("임재홍 5"), plus the editor for editors. */
export function PresidencyBar() {
  const { board, memberById, canEdit } = useWorkspace();
  const filter = useWorkspaceStore((s) => s.supervisorFilter);
  const setFilter = useWorkspaceStore((s) => s.setSupervisorFilter);
  const toggle = useWorkspaceStore((s) => s.toggleSupervisorFilter);
  const [editing, setEditing] = useState(false);

  const counts = useMemo(() => supervisionCounts(board), [board]);
  const presidents = useMemo(
    () =>
      board.presidencyIds
        .map((id) => memberById.get(id))
        .filter((m) => m !== undefined)
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ko')),
    [board.presidencyIds, memberById],
  );
  const unsupervised = counts.get(null) ?? 0;

  // A filter that no longer matches anything (person left the presidency, last unsupervised ministry assigned)
  // would leave an empty board with no visible reason; drop it.
  const stale =
    filter !== null && (filter === 'none' ? unsupervised === 0 : !board.presidencyIds.includes(filter));
  useEffect(() => {
    if (stale) setFilter(null);
  }, [stale, setFilter]);

  const chip = (key: SupervisorFilter, text: string, count: number) => {
    const on = filter === key;
    return (
      <button
        key={key ?? 'all'}
        type="button"
        className={clsx('aw-pchip', on && 'aw-pchip--on', key === 'none' && 'aw-pchip--none')}
        aria-pressed={on}
        onClick={() => (key === null ? setFilter(null) : toggle(key))}
      >
        {text} <b>{count}</b>
      </button>
    );
  };

  return (
    <div className="aw-pres" role="group" aria-label={T.presidency.label}>
      <span className="aw-pres-lab">{T.presidency.label}</span>
      <div className="aw-pres-chips">
        {presidents.length === 0 ? (
          <span className="aw-pres-empty">{T.presidency.empty}</span>
        ) : (
          <>
            {chip(null, T.presidency.all, board.ministries.length)}
            {presidents.map((m) => chip(m.id, m.full_name, counts.get(m.id) ?? 0))}
            {unsupervised > 0 && chip('none', T.presidency.none, unsupervised)}
          </>
        )}
      </div>
      {canEdit && (
        <button type="button" className="aw-pres-edit" onClick={() => setEditing(true)}>
          {T.presidency.edit}
        </button>
      )}
      {canEdit && <PresidencyDialog open={editing} onClose={() => setEditing(false)} />}
    </div>
  );
}
