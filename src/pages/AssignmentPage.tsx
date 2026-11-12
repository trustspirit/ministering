import { useEffect, useMemo, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { useMembers } from '@/features/members/hooks/useMembers';
import { useHouseholds } from '@/features/households/hooks/useHouseholds';
import type { Organization } from '@/features/ministries/types';
import { useAssignmentBoard } from '@/features/assignment/hooks/useAssignmentBoard';
import { useBoardActions } from '@/features/assignment/hooks/useBoardActions';
import { endDrag } from '@/features/assignment/dnd';
import { useWorkspaceStore } from '@/features/assignment/store';
import { buildLookups, WorkspaceContext, type WorkspaceData } from '@/features/assignment/workspaceContext';
import { BoardPanel } from '@/features/assignment/ui/BoardPanel';
import { PoolPanel } from '@/features/assignment/ui/PoolPanel';
import { ResizeBar } from '@/features/assignment/ui/ResizeBar';
import { SummaryBar } from '@/features/assignment/ui/SummaryBar';
import { usePermission } from '@/shared/auth/usePermission';
import { useRealtimeSync } from '@/shared/hooks/useRealtimeSync';
import { T } from '@/shared/copy';
import '@/features/assignment/ui/assignment.css';

const REALTIME_TABLES = [
  'ministries',
  'ministry_companions',
  'ministry_member_recipients',
  'ministry_household_recipients',
  'members',
  'households',
] as const;

/** Share links arrive in Task 12. */
const noShare = () => {};

export default function AssignmentPage() {
  const { org: orgParam } = useParams<{ org: string }>();
  const org: Organization = orgParam === 'eq' ? 'EQ' : 'RS';

  const setOrg = useWorkspaceStore((s) => s.setOrg);
  const sideWidth = useWorkspaceStore((s) => s.sideWidth);
  useEffect(() => setOrg(org), [org, setOrg]);

  // A drag whose source card unmounted mid-drag never gets its own dragend.
  useEffect(() => {
    document.addEventListener('dragend', endDrag);
    document.addEventListener('drop', endDrag);
    return () => {
      document.removeEventListener('dragend', endDrag);
      document.removeEventListener('drop', endDrag);
    };
  }, []);

  useRealtimeSync([...REALTIME_TABLES], `assignments-${org}`);

  const boardQuery = useAssignmentBoard(org);
  const membersQuery = useMembers();
  const householdsQuery = useHouseholds();
  const perm = usePermission();
  const actions = useBoardActions(org);
  const canEdit = org === 'EQ' ? perm.canEditEQ : perm.canEditRS;

  const members = membersQuery.data;
  const households = householdsQuery.data;
  const board = boardQuery.data;

  const lookups = useMemo(
    () => (members && households ? buildLookups(members, households) : null),
    [members, households],
  );

  const value: WorkspaceData | null =
    board && members && lookups && board.organization === org
      ? { org, board, canEdit, members, ...lookups, actions, onShare: noShare }
      : null;

  const failed = boardQuery.isError || membersQuery.isError || householdsQuery.isError;

  return (
    <div className="aw" style={{ '--side': sideWidth } as CSSProperties}>
      {!value || !households ? (
        <p className="aw-status-msg">{failed ? T.assign.loadFailed : T.assign.loading}</p>
      ) : (
        <WorkspaceContext.Provider value={value}>
          <SummaryBar households={households} />
          <div className="aw-work">
            <PoolPanel households={households} />
            <BoardPanel />
            <ResizeBar />
            {/* Map (Task 8) and background detail (Task 9) go here. */}
            <aside className="aw-side" />
          </div>
        </WorkspaceContext.Provider>
      )}
    </div>
  );
}
