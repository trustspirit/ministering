import type { Member } from '@/features/members/types';
import type { Household } from '@/features/households/types';
import type { Ministry, ValidationResult } from '../types';

export type RecipientTarget =
  | { type: 'member'; member: Pick<Member, 'id' | 'gender' | 'household_id'> }
  | { type: 'household'; household: Pick<Household, 'id'> };

export interface ValidateRecipientContext {
  companionMemberIds: string[];
  companionHouseholdIds: string[];
}

export function validateRecipient(
  ministry: Pick<Ministry, 'organization'>,
  target: RecipientTarget,
  context: ValidateRecipientContext,
): ValidationResult {
  if (ministry.organization === 'RS') {
    if (target.type !== 'member') {
      return { ok: false, code: 'wrong_target', message: 'RS 조원은 자매 개인만' };
    }
    if (target.member.gender !== 'F') {
      return { ok: false, code: 'wrong_gender', message: 'RS 조원은 여자만' };
    }
    if (context.companionMemberIds.includes(target.member.id)) {
      return { ok: false, code: 'self_assignment', message: '자기 자신을 방문할 수 없음' };
    }
    return { ok: true };
  }

  if (ministry.organization === 'EQ') {
    if (target.type !== 'household') {
      return { ok: false, code: 'wrong_target', message: 'EQ 조원은 가정 단위' };
    }
    if (context.companionHouseholdIds.includes(target.household.id)) {
      return { ok: false, code: 'self_assignment', message: '동반자가 속한 가정은 조원이 될 수 없음' };
    }
    return { ok: true };
  }

  return { ok: false, code: 'unknown_organization', message: '알 수 없는 조직' };
}
