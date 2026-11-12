import type { Member } from '@/features/members/types';

type FamilyInput = Pick<Member, 'household_role' | 'birth_date'>;

function rank(role: Member['household_role']): number {
  if (role === 'husband') return 0;
  if (role === 'wife') return 1;
  return 2;
}

export function sortFamily<T extends FamilyInput>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const r = rank(a.household_role) - rank(b.household_role);
    if (r !== 0) return r;
    return a.birth_date < b.birth_date ? -1 : a.birth_date > b.birth_date ? 1 : 0;
  });
}
