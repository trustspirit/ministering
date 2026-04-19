import type { Member } from '@/features/members/types';

export function isMarriedCouple(
  a: Pick<Member, 'household_id' | 'household_role'>,
  b: Pick<Member, 'household_id' | 'household_role'>,
): boolean {
  if (!a.household_id || !b.household_id) return false;
  if (a.household_id !== b.household_id) return false;
  const roles = [a.household_role, b.household_role].sort();
  return roles[0] === 'husband' && roles[1] === 'wife';
}
