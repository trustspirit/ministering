import type { Household } from '@/features/households/types';
import type { Member } from '@/features/members/types';
import type { Organization } from '@/features/ministries/types';
import { T } from '@/shared/copy';
import { isOrgMember } from './orgMembership';

export interface BoardMinistry {
  id: string;
  number: number;
  name: string | null;
  /** A member of this organization's presidency, or null. */
  supervisorId: string | null;
  companionIds: string[];
  /** EQ: household ids, RS: member ids */
  recipientIds: string[];
}

export interface Board {
  organization: Organization;
  /** Member ids of this organization's presidency. */
  presidencyIds: string[];
  ministries: BoardMinistry[];
}

/** Ministries matching a supervisor filter: a member id, 'none' (no supervisor), or null (all). */
export function filterBySupervisor(ministries: BoardMinistry[], filter: string | 'none' | null): BoardMinistry[] {
  if (filter === null) return ministries;
  const want = filter === 'none' ? null : filter;
  return ministries.filter((m) => m.supervisorId === want);
}

/** Ministries per supervisor id; the null key counts ministries without a supervisor. */
export function supervisionCounts(board: Board): Map<string | null, number> {
  const counts = new Map<string | null, number>();
  for (const m of board.ministries) counts.set(m.supervisorId, (counts.get(m.supervisorId) ?? 0) + 1);
  return counts;
}

export type AssignRole = 'companion' | 'recipient';

export function ministryOf(
  board: Board,
  id: string,
  role: AssignRole,
): BoardMinistry | undefined {
  return board.ministries.find((m) =>
    (role === 'companion' ? m.companionIds : m.recipientIds).includes(id),
  );
}

function idsOf(board: Board, role: AssignRole): Set<string> {
  return new Set(
    board.ministries.flatMap((m) => (role === 'companion' ? m.companionIds : m.recipientIds)),
  );
}

function orgMembers(board: Board, members: Member[], today?: Date): Member[] {
  return members.filter((m) => isOrgMember(m, board.organization, today));
}

export function unassignedCandidates(
  board: Board,
  members: Member[],
  today?: Date,
): Member[] {
  const assigned = idsOf(board, 'companion');
  return orgMembers(board, members, today).filter((m) => !assigned.has(m.id));
}

export function unassignedRecipients(
  board: Board,
  members: Member[],
  households: Household[],
  today?: Date,
): (Member | Household)[] {
  const assigned = idsOf(board, 'recipient');
  const pool: (Member | Household)[] =
    board.organization === 'EQ' ? households : orgMembers(board, members, today);
  return pool.filter((r) => !assigned.has(r.id));
}

export interface BoardSummary {
  ministryCount: number;
  recipientTotal: number;
  recipientAssigned: number;
  shortMinistryCount: number;
  unassignedCandidateCount: number;
}

export function summarize(
  board: Board,
  members: Member[],
  households: Household[],
  today?: Date,
): BoardSummary {
  const recipientTotal =
    board.organization === 'EQ' ? households.length : orgMembers(board, members, today).length;
  return {
    ministryCount: board.ministries.length,
    recipientTotal,
    recipientAssigned: recipientTotal - unassignedRecipients(board, members, households, today).length,
    shortMinistryCount: board.ministries.filter((m) => m.companionIds.length < 2).length,
    unassignedCandidateCount: unassignedCandidates(board, members, today).length,
  };
}

export function ministryWarnings(m: BoardMinistry): {
  tooFewCompanions: boolean;
  noRecipients: boolean;
} {
  return {
    tooFewCompanions: m.companionIds.length < 2,
    noRecipients: m.recipientIds.length === 0,
  };
}

export function ministryLabel(m: Pick<BoardMinistry, 'number' | 'name'>): string {
  return m.name || T.ministry.defaultLabel(m.number);
}

/** Ids given to optimistically created ministries until the server returns the real one. */
export const PENDING_MINISTRY_PREFIX = 'tmp-';

export function isPendingMinistry(id: string): boolean {
  return id.startsWith(PENDING_MINISTRY_PREFIX);
}
