import { BottomSheet, Button } from 'trust-ui-react';
import { T } from '@/shared/copy';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { canBeAssigned } from '../domain/assignOptions';
import { ministryOf } from '../domain/board';
import { useAssign } from '../dnd';
import { useWorkspaceStore } from '../store';
import { useWorkspace } from '../workspaceContext';
import { AssignSelect } from './AssignSelect';
import { DetailPanel } from './DetailPanel';

const SNAP_POINTS = [0.72];

/**
 * Tabbed layout only (phone and tablet, below 1024px): the selected card or pin opens as a bottom sheet with the
 * assign row on top and the background information below. Closing the sheet clears the selection.
 */
export function MobileSheet() {
  const isMobile = useIsMobile();
  const selected = useWorkspaceStore((s) => s.selected);
  const setSelected = useWorkspaceStore((s) => s.setSelected);
  const { org, board, canEdit, memberById } = useWorkspace();
  const assign = useAssign(org);

  if (!isMobile) return null;

  const member = selected?.kind === 'member' ? memberById.get(selected.id) : undefined;
  const assignable = !!selected && canEdit && canBeAssigned(org, selected, member);
  const assigned =
    !!selected &&
    (ministryOf(board, selected.id, 'companion') !== undefined ||
      ministryOf(board, selected.id, 'recipient') !== undefined);

  return (
    <BottomSheet
      open={selected !== null}
      onClose={() => setSelected(null)}
      snapPoints={SNAP_POINTS}
      // centred, at most 560px wide on tablets (assignment.css)
      className="aw-msheet"
      aria-label={T.mobile.sheetLabel}
    >
      {selected && (
        // `aw` again: the sheet is portalled out of the workspace, which scopes the detail styles.
        <div className="aw aw-sheet">
          <div className="aw-massign">
            {assignable && <AssignSelect item={selected} />}
            {assignable && assigned && (
              <Button
                size="sm"
                variant="outline" shape="square"
                onClick={() => assign({ kind: selected.kind, id: selected.id, from: null }, { type: 'pool' })}
              >
                {T.mobile.release}
              </Button>
            )}
            <Button size="sm" variant="outline" shape="square" onClick={() => setSelected(null)}>
              {T.mobile.close}
            </Button>
          </div>
          <DetailPanel />
        </div>
      )}
    </BottomSheet>
  );
}
