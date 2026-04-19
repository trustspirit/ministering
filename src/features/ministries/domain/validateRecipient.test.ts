import { describe, expect, it } from 'vitest';
import { validateRecipient } from './validateRecipient';

const rsMinistry = { id: 'rs1', organization: 'RS', number: 1, name: null } as never;
const eqMinistry = { id: 'eq1', organization: 'EQ', number: 1, name: null } as never;

const member = (p: Partial<{ id: string; gender: string; household_id: string | null }>) => ({
  id: 'm1',
  gender: 'F' as const,
  household_id: null,
  ...p,
}) as never;

const household = (p: Partial<{ id: string }>) => ({
  id: 'h1',
  ...p,
}) as never;

describe('validateRecipient', () => {
  describe('RS ministry', () => {
    it('자매(F) 회원 → ok', () => {
      const res = validateRecipient(rsMinistry, {
        type: 'member',
        member: member({ gender: 'F' }),
      }, { companionMemberIds: [], companionHouseholdIds: [] });
      expect(res.ok).toBe(true);
    });

    it('남자(M) 회원 → fail (code: wrong_gender)', () => {
      const res = validateRecipient(rsMinistry, {
        type: 'member',
        member: member({ gender: 'M' }),
      }, { companionMemberIds: [], companionHouseholdIds: [] });
      expect(res).toMatchObject({ ok: false, code: 'wrong_gender' });
    });

    it('household target → fail (code: wrong_target)', () => {
      const res = validateRecipient(rsMinistry, {
        type: 'household',
        household: household({}),
      }, { companionMemberIds: [], companionHouseholdIds: [] });
      expect(res).toMatchObject({ ok: false, code: 'wrong_target' });
    });

    it('자기 자신이 동반자인 조에 조원으로 배정 → fail (code: self_assignment)', () => {
      const res = validateRecipient(rsMinistry, {
        type: 'member',
        member: member({ id: 'm1', gender: 'F' }),
      }, { companionMemberIds: ['m1'], companionHouseholdIds: [] });
      expect(res).toMatchObject({ ok: false, code: 'self_assignment' });
    });
  });

  describe('EQ ministry', () => {
    it('가정 → ok', () => {
      const res = validateRecipient(eqMinistry, {
        type: 'household',
        household: household({ id: 'h1' }),
      }, { companionMemberIds: [], companionHouseholdIds: [] });
      expect(res.ok).toBe(true);
    });

    it('member target → fail (code: wrong_target)', () => {
      const res = validateRecipient(eqMinistry, {
        type: 'member',
        member: member({}),
      }, { companionMemberIds: [], companionHouseholdIds: [] });
      expect(res).toMatchObject({ ok: false, code: 'wrong_target' });
    });

    it('동반자가 속한 가정 → fail (code: self_assignment)', () => {
      const res = validateRecipient(eqMinistry, {
        type: 'household',
        household: household({ id: 'h1' }),
      }, { companionMemberIds: ['m1', 'm2'], companionHouseholdIds: ['h1'] });
      expect(res).toMatchObject({ ok: false, code: 'self_assignment' });
    });
  });
});
