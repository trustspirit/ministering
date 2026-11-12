import type { Member } from '@/features/members/types';
import { validateCompanions } from '@/features/ministries/domain/validateCompanions';
import { validateRecipient } from '@/features/ministries/domain/validateRecipient';
import { T } from '@/shared/copy';
import type { AssignRole, Board } from './board';
import { isOrgMember } from './orgMembership';

export type DragItem = {
  kind: 'member' | 'household';
  id: string;
  /** Role of the list/slot the drag started from; map pins are null. */
  from: AssignRole | null;
};
export type DropTarget =
  | { type: 'ministry'; ministryId: string; zone: AssignRole | null }
  | { type: 'new' }
  | { type: 'pool' };
export const NEW_MINISTRY = '__new__';
export type Op =
  | { type: 'createMinistry' }
  | { type: 'add'; role: AssignRole; ministryId: string; targetId: string }
  | { type: 'remove'; role: AssignRole; ministryId: string; targetId: string };
export type DropResult = { ok: true; ops: Op[] } | { ok: false; message: string };

const MAX_COMPANIONS = 4;

const reject = (message: string): DropResult => ({ ok: false, message });

function holdingMinistries(board: Board, id: string, role: AssignRole): string[] {
  return board.ministries
    .filter((m) => (role === 'companion' ? m.companionIds : m.recipientIds).includes(id))
    .map((m) => m.id);
}

function removeOps(board: Board, id: string, role: AssignRole): Op[] {
  return holdingMinistries(board, id, role).map((ministryId) => ({
    type: 'remove',
    role,
    ministryId,
    targetId: id,
  }));
}

/** Returns a rejection message, or null when the role may be taken in that ministry. */
function checkAssignable(
  board: Board,
  item: DragItem,
  role: AssignRole,
  companionIds: string[],
  recipientIds: string[],
  members: Member[],
  today?: Date,
): string | null {
  const org = board.organization;
  const find = (id: string) => members.find((m) => m.id === id);

  if (role === 'companion') {
    if (item.kind !== 'member') return T.drop.eqHouseholdUnit;
    const who = find(item.id);
    if (!who) return T.drop.notFound;
    if (!isOrgMember(who, org, today)) {
      return org === 'EQ' ? T.drop.eqCompanionOnly : T.drop.rsCompanionOnly;
    }
    if (companionIds.length + 1 > MAX_COMPANIONS) return T.drop.tooManyCompanions;

    const eligible = companionIds
      .map(find)
      .filter((m): m is Member => !!m && isOrgMember(m, org, today));
    const result = validateCompanions([...eligible, who]);
    if (!result.ok && result.code !== 'too_few') return result.message;

    if (org === 'EQ' && who.household_id && recipientIds.includes(who.household_id)) {
      return T.drop.selfHousehold;
    }
    if (org === 'RS' && recipientIds.includes(who.id)) return T.drop.selfPerson;
    return null;
  }

  // recipient
  const companionMembers = companionIds.map(find).filter((m): m is Member => !!m);
  const context = {
    companionMemberIds: companionIds,
    companionHouseholdIds: companionMembers.flatMap((m) => (m.household_id ? [m.household_id] : [])),
  };
  if (org === 'EQ') {
    if (item.kind !== 'household') return T.drop.eqHouseholdUnit;
    const result = validateRecipient({ organization: org }, { type: 'household', household: { id: item.id } }, context);
    return result.ok ? null : result.code === 'self_assignment' ? T.drop.selfHousehold : result.message;
  }
  if (item.kind !== 'member') return T.drop.rsRecipientOnly;
  const who = find(item.id);
  if (!who) return T.drop.notFound;
  if (!isOrgMember(who, org, today)) return T.drop.rsRecipientOnly;
  const result = validateRecipient({ organization: org }, { type: 'member', member: who }, context);
  if (result.ok) return null;
  if (result.code === 'self_assignment') return T.drop.selfPerson;
  return result.code === 'wrong_gender' ? T.drop.rsRecipientOnly : result.message;
}

export function resolveDrop(a: {
  board: Board;
  item: DragItem;
  target: DropTarget;
  members: Member[];
  today?: Date;
}): DropResult {
  const { board, item, target, members, today } = a;
  const isEq = board.organization === 'EQ';

  if (target.type === 'pool') {
    const roles: AssignRole[] = isEq
      ? [item.kind === 'member' ? 'companion' : 'recipient']
      : item.from
        ? [item.from]
        : ['companion', 'recipient'];
    return { ok: true, ops: roles.flatMap((role) => removeOps(board, item.id, role)) };
  }

  let role: AssignRole | null;
  if (isEq) {
    role = item.kind === 'member' ? 'companion' : 'recipient';
    if (target.type === 'ministry' && target.zone && target.zone !== role) {
      return reject(T.drop.eqHouseholdUnit);
    }
  } else {
    role = (target.type === 'ministry' ? target.zone : null) ?? item.from;
    if (!role) return reject(T.drop.needZoneRs);
  }

  if (target.type === 'new') {
    const message = checkAssignable(board, item, role, [], [], members, today);
    if (message) return reject(message);
    return {
      ok: true,
      ops: [
        ...removeOps(board, item.id, role),
        { type: 'createMinistry' },
        { type: 'add', role, ministryId: NEW_MINISTRY, targetId: item.id },
      ],
    };
  }

  const dest = board.ministries.find((m) => m.id === target.ministryId);
  if (!dest) return reject(T.drop.notFound);
  const held = holdingMinistries(board, item.id, role);
  if (held.length === 1 && held[0] === dest.id) return { ok: true, ops: [] };

  const message = checkAssignable(board, item, role, dest.companionIds, dest.recipientIds, members, today);
  if (message) return reject(message);
  return {
    ok: true,
    ops: [
      ...removeOps(board, item.id, role),
      { type: 'add', role, ministryId: dest.id, targetId: item.id },
    ],
  };
}
