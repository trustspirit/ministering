import type { Member } from '@/features/members/types';
import type { Organization } from '@/features/ministries/types';
import { T } from '@/shared/copy';
import { isPendingMinistry, ministryLabel, type AssignRole, type Board } from './board';
import { isOrgMember } from './orgMembership';
import type { DropTarget } from './resolveDrop';

export interface AssignOption {
  label: string;
  target: DropTarget;
  from: AssignRole | null;
}

/**
 * The tap-to-assign choices for one item, in the order shown. Each is a drop target that
 * `resolveDrop` understands. Pending (not yet saved) ministries and ministries the item already
 * holds in that role are left out.
 */
export function assignOptions(board: Board, item: { kind: 'member' | 'household'; id: string }): AssignOption[] {
  const ministries = board.ministries.filter((m) => !isPendingMinistry(m.id));
  const options: AssignOption[] = [];

  if (board.organization === 'EQ') {
    const role: AssignRole = item.kind === 'member' ? 'companion' : 'recipient';
    for (const m of ministries) {
      const held = (role === 'companion' ? m.companionIds : m.recipientIds).includes(item.id);
      if (held) continue;
      options.push({
        label: T.mobile.toMinistry(ministryLabel(m)),
        target: { type: 'ministry', ministryId: m.id, zone: null },
        from: null,
      });
    }
    options.push({ label: T.mobile.toNewMinistry, target: { type: 'new' }, from: null });
    return options;
  }

  for (const m of ministries) {
    const label = ministryLabel(m);
    if (!m.companionIds.includes(item.id)) {
      options.push({
        label: T.mobile.asCompanionOf(label),
        target: { type: 'ministry', ministryId: m.id, zone: 'companion' },
        from: null,
      });
    }
    if (!m.recipientIds.includes(item.id)) {
      options.push({
        label: T.mobile.assignedTo(label),
        target: { type: 'ministry', ministryId: m.id, zone: 'recipient' },
        from: null,
      });
    }
  }
  options.push({ label: T.mobile.asCompanionOfNew, target: { type: 'new' }, from: null });
  return options;
}

/**
 * Whether the item can be assigned on this board at all. EQ assigns households and elders quorum
 * members; RS assigns relief society members. Anyone else (a child, a sister on the EQ screen, a
 * household on the RS screen) has no assign select. `member` is the item's record when it is one.
 */
export function canBeAssigned(
  org: Organization,
  item: { kind: 'member' | 'household' },
  member?: Pick<Member, 'gender' | 'birth_date'>,
  today?: Date,
): boolean {
  if (item.kind === 'household') return org === 'EQ';
  return !!member && isOrgMember(member, org, today);
}
