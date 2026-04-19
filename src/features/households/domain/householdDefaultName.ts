import type { Member } from '@/features/members/types';
import { computeAge } from '@/features/members/domain/computeAge';

export function householdDefaultName(
  members: Pick<Member, 'full_name' | 'household_role' | 'birth_date' | 'gender'>[],
  today: Date = new Date(),
): string {
  if (members.length === 0) return '새 가정';

  const husband = members.find((m) => m.household_role === 'husband');
  if (husband) return `${husband.full_name} 가정`;

  const wife = members.find((m) => m.household_role === 'wife');
  if (wife) return `${wife.full_name} 가정`;

  const adults = members.filter((m) => computeAge(m.birth_date, today) >= 18);
  if (adults.length > 0) {
    const oldest = adults.reduce((a, b) =>
      computeAge(a.birth_date, today) >= computeAge(b.birth_date, today) ? a : b,
    );
    return `${oldest.full_name} 가정`;
  }

  return `${members[0].full_name} 가정`;
}
