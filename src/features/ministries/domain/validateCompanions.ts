import type { Member } from '@/features/members/types';
import type { ValidationResult } from '../types';
import { isMarriedCouple } from './isMarriedCouple';

type CompanionMember = Pick<Member, 'gender' | 'household_id' | 'household_role'>;

export function validateCompanions(members: CompanionMember[]): ValidationResult {
  if (members.length < 2) {
    return { ok: false, code: 'too_few', message: '최소 2명 필요' };
  }
  if (members.length > 4) {
    return { ok: false, code: 'too_many', message: '최대 4명' };
  }

  const genders = new Set(members.map((m) => m.gender));
  if (genders.size === 1) return { ok: true };

  if (members.length === 2 && isMarriedCouple(members[0], members[1])) {
    return { ok: true };
  }

  return { ok: false, code: 'mixed_gender', message: '동성 또는 부부만 가능' };
}
