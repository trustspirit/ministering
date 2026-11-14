import { useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from 'trust-ui-react';
import { useMembers } from '@/features/members/hooks/useMembers';
import { useHouseholds } from '@/features/households/hooks/useHouseholds';
import type { Organization } from '@/features/ministries/types';
import { useAssignmentBoard } from '@/features/assignment/hooks/useAssignmentBoard';
import { useBoardActions } from '@/features/assignment/hooks/useBoardActions';
import { endDrag, isOurDrag } from '@/features/assignment/dnd';
import { summarize } from '@/features/assignment/domain/board';
import { clampSideWidth, poolWidthFor } from '@/features/assignment/domain/clampSideWidth';
import { useWorkspaceStore } from '@/features/assignment/store';
import { buildLookups, WorkspaceContext, type WorkspaceData } from '@/features/assignment/workspaceContext';
import { BoardPanel } from '@/features/assignment/ui/BoardPanel';
import { DetailPanel } from '@/features/assignment/ui/DetailPanel';
import { MobileSheet } from '@/features/assignment/ui/MobileSheet';
import { MobileTabs } from '@/features/assignment/ui/MobileTabs';
import { MapPanel } from '@/features/assignment/ui/MapPanel';
import { PoolPanel } from '@/features/assignment/ui/PoolPanel';
import { PresidencyBar } from '@/features/assignment/ui/PresidencyBar';
import { ResizeBar } from '@/features/assignment/ui/ResizeBar';
import { SummaryBar } from '@/features/assignment/ui/SummaryBar';
import { usePermission } from '@/shared/auth/usePermission';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
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
  'presidency_members',
  'ministry_pool',
] as const;

export default function AssignmentPage() {
  const { org: orgParam } = useParams<{ org: string }>();
  const org: Organization = orgParam === 'eq' ? 'EQ' : 'RS';

  const setOrg = useWorkspaceStore((s) => s.setOrg);
  useEffect(() => setOrg(org), [org, setOrg]);

  // The right column width is applied straight to the DOM so resizing does not re-render the board. It is always
  // clamped to the window, so a preset or a stored px width never pushes the map column past the edge.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      const px = clampSideWidth(useWorkspaceStore.getState().sideWidth, w, poolWidthFor(w));
      rootRef.current?.style.setProperty('--side', `${px}px`);
    };
    apply();
    window.addEventListener('resize', apply);
    const unsubscribe = useWorkspaceStore.subscribe((s, prev) => {
      if (s.sideWidth !== prev.sideWidth) apply();
    });
    return () => {
      window.removeEventListener('resize', apply);
      unsubscribe();
    };
  }, []);

  // Drag state cleanup. When the source card unmounts mid-drag (e.g. a realtime refetch), its
  // dragend is dispatched on the detached node and never arrives here; the next foreign
  // dragover (a file or selected text) then clears the stale item.
  useEffect(() => {
    const clearIfForeign = (e: DragEvent) => {
      if (!isOurDrag(e)) endDrag();
    };
    document.addEventListener('dragend', endDrag);
    document.addEventListener('drop', endDrag);
    document.addEventListener('dragover', clearIfForeign);
    return () => {
      document.removeEventListener('dragend', endDrag);
      document.removeEventListener('drop', endDrag);
      document.removeEventListener('dragover', clearIfForeign);
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

  const value = useMemo<WorkspaceData | null>(
    () =>
      board && members && lookups && board.organization === org
        ? { org, board, canEdit, members, ...lookups, actions }
        : null,
    [org, board, canEdit, members, lookups, actions],
  );

  const isMobile = useIsMobile();
  const mobileTab = useWorkspaceStore((s) => s.mobileTab);
  const setMobileTab = useWorkspaceStore((s) => s.setMobileTab);

  const poolCount = useMemo(() => {
    if (!board || !members || !households) return 0;
    const s = summarize(board, members, households);
    return s.unassignedCandidateCount + s.recipientTotal - s.recipientAssigned;
  }, [board, members, households]);

  const failed = boardQuery.isError || membersQuery.isError || householdsQuery.isError;

  return (
    <div className="aw" ref={rootRef} data-mtab={isMobile ? mobileTab : undefined}>
      {!value || !households ? (
        failed ? (
          <p className="aw-status-msg">{T.assign.loadFailed}</p>
        ) : (
          <div className="app-loading">
            <Spinner size="sm" label={T.assign.loading} showLabel />
          </div>
        )
      ) : (
        <WorkspaceContext.Provider value={value}>
          <SummaryBar households={households} />
          <PresidencyBar />
          <div className="aw-work">
            <PoolPanel households={households} />
            <BoardPanel />
            <ResizeBar />
            <aside className="aw-side">
              <MapPanel />
              {!isMobile && <DetailPanel />}
            </aside>
          </div>
          {isMobile && (
            <>
              <MobileTabs
                tab={mobileTab}
                onChange={setMobileTab}
                poolCount={poolCount}
                boardCount={value.board.ministries.length}
              />
              <MobileSheet />
            </>
          )}
        </WorkspaceContext.Provider>
      )}
    </div>
  );
}
