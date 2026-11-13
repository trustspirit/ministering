import '@/shared/ui/subbar.css';
import { useMemo } from 'react';
import type { Household } from '@/features/households/types';
import type { ActiveStatus } from '@/features/members/types';
import { STATUS_LABEL, T } from '@/shared/copy';
import { useSubbarFit } from '@/shared/ui/useSubbarFit';
import { summarize } from '../domain/board';
import { useWorkspaceStore } from '../store';
import { useWorkspace } from '../workspaceContext';
import { StatusMark } from './StatusMark';

const STATUSES: ActiveStatus[] = ['active', 'less_active', 'new_member'];

export function SummaryBar({ households }: { households: Household[] }) {
  const { org, board, members } = useWorkspace();
  const sideWidth = useWorkspaceStore((s) => s.sideWidth);
  const setSideWidth = useWorkspaceStore((s) => s.setSideWidth);
  const s = useMemo(() => summarize(board, members, households), [board, members, households]);
  const recipientNoun = T.assign.recipientNoun[org];
  const unassignedRecipients = s.recipientTotal - s.recipientAssigned;
  const fitRef = useSubbarFit(
    [org, s.ministryCount, s.recipientAssigned, s.recipientTotal, s.shortMinistryCount, s.unassignedCandidateCount].join('|'),
  );

  // Hide order when narrow (subbar.css / assignment.css): description, then legend; the size switch shows only in
  // the three-column layout; warnings always show and wrap.
  return (
    <div className="aw-sub" ref={fitRef}>
      <span className="aw-unit">{T.assign.unit[org]}</span>
      <span className="aw-sum">
        <span className="aw-desc">{T.assign.unitDescription[org]}</span>
        <span className="aw-mcount">
          {T.assign.ministryCount} <b>{s.ministryCount}</b>
        </span>
        <span>
          {recipientNoun}{' '}
          <b>
            {s.recipientAssigned}/{s.recipientTotal}
          </b>{' '}
          {T.assign.assignedSuffix}
        </span>
        {s.shortMinistryCount > 0 && (
          <span className="aw-wr aw-wr--bad">
            {T.warnMark} {T.assign.warnShortMinistries} <b>{s.shortMinistryCount}</b>
          </span>
        )}
        {unassignedRecipients > 0 && (
          <span className="aw-wr">
            {T.warnMark} {T.assign.warnUnassignedRecipients(recipientNoun)} <b>{unassignedRecipients}</b>
          </span>
        )}
        {s.unassignedCandidateCount > 0 && (
          <span className="aw-wr">
            {T.warnMark} {T.assign.warnUnassignedCandidates(T.assign.companionNoun[org])}{' '}
            <b>{s.unassignedCandidateCount}</b>
          </span>
        )}
      </span>
      {/* legend and size switch stay together at the right end, also when they wrap onto a second row */}
      <div className="aw-subend">
        <ul className="aw-legend" aria-label={T.assign.legendLabel}>
          {STATUSES.map((st) => (
            <li key={st}>
              <StatusMark status={st} />
              {STATUS_LABEL[st]}
            </li>
          ))}
        </ul>
        <div className="aw-seg" role="group" aria-label={T.assign.sizeLabel}>
          {T.assign.sizePresets.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={sideWidth === p.value}
              onClick={() => setSideWidth(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
