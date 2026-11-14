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

export interface BoardPool {
  /** Members the board offers as companions. */
  companionIds: string[];
  /** EQ: household ids, RS: member ids. */
  recipientIds: string[];
}

export interface Board {
  organization: Organization;
  /** Member ids of this organization's presidency. */
  presidencyIds: string[];
  /** Who the board shows, by role. Everyone assigned is in it too (database rule). */
  pool: BoardPool;
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

/**
 * Ids in the pool for a role. Assigned ids count as pooled too: the database adds them, but an optimistic
 * assignment can show before the pool row arrives.
 */
export function pooledIds(board: Board, role: AssignRole): Set<string> {
  const listed = role === 'companion' ? board.pool.companionIds : board.pool.recipientIds;
  return new Set([...listed, ...idsOf(board, role)]);
}

/** Everyone who may fill a role on this board: adults of the organization, or households for EQ recipients. */
function eligible(
  board: Board,
  role: AssignRole,
  members: Member[],
  households: Household[],
  today?: Date,
): (Member | Household)[] {
  return board.organization === 'EQ' && role === 'recipient' ? households : orgMembers(board, members, today);
}

function pooled(board: Board, role: AssignRole, members: Member[], households: Household[], today?: Date) {
  const ids = pooledIds(board, role);
  return eligible(board, role, members, households, today).filter((r) => ids.has(r.id));
}

/** Who can still be added to the pool for a role. */
export function poolAddable(
  board: Board,
  role: AssignRole,
  members: Member[],
  households: Household[],
  today?: Date,
): (Member | Household)[] {
  const ids = pooledIds(board, role);
  return eligible(board, role, members, households, today).filter((r) => !ids.has(r.id));
}

export function unassignedCandidates(
  board: Board,
  members: Member[],
  today?: Date,
): Member[] {
  const assigned = idsOf(board, 'companion');
  return (pooled(board, 'companion', members, [], today) as Member[]).filter((m) => !assigned.has(m.id));
}

export function unassignedRecipients(
  board: Board,
  members: Member[],
  households: Household[],
  today?: Date,
): (Member | Household)[] {
  const assigned = idsOf(board, 'recipient');
  return pooled(board, 'recipient', members, households, today).filter((r) => !assigned.has(r.id));
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
  const recipientTotal = pooled(board, 'recipient', members, households, today).length;
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
