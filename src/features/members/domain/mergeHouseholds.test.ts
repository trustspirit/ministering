import { describe, expect, it } from 'vitest';
import { extractHouseholdPlan } from './mergeHouseholds';
import type { ParsedMemberRow } from './parseMemberCsv';

const row = (p: Partial<ParsedMemberRow>): ParsedMemberRow => ({
  full_name: 'X',
  gender: 'M',
  birth_date: '1990-01-01',
  address: null,
  active_status: 'active',
  personality: 'moderate',
  memo: null,
  household_name: null,
  household_role: 'other',
  ...p,
});

describe('extractHouseholdPlan', () => {
  it('household_name 이 없으면 빈 plan', () => {
    const rows = [row({ household_name: null }), row({ household_name: null })];
    const plan = extractHouseholdPlan(rows, []);
    expect(plan.toCreate).toEqual([]);
    expect(plan.existingNameToId).toEqual({});
  });

  it('새 household_name 은 toCreate 에', () => {
    const rows = [row({ household_name: '김성도 가정', address: '서울' })];
    const plan = extractHouseholdPlan(rows, []);
    expect(plan.toCreate).toEqual([{ name: '김성도 가정', address: '서울' }]);
  });

  it('기존 household 와 이름 매칭', () => {
    const rows = [row({ household_name: '김성도 가정' })];
    const plan = extractHouseholdPlan(rows, [{ id: 'h1', name: '김성도 가정' }]);
    expect(plan.toCreate).toEqual([]);
    expect(plan.existingNameToId).toEqual({ '김성도 가정': 'h1' });
  });

  it('같은 household_name 은 한 번만 생성', () => {
    const rows = [
      row({ household_name: '김성도 가정', household_role: 'husband' }),
      row({ household_name: '김성도 가정', household_role: 'wife' }),
    ];
    const plan = extractHouseholdPlan(rows, []);
    expect(plan.toCreate).toEqual([{ name: '김성도 가정', address: null }]);
  });

  it('첫 row 의 address 를 가정 주소로 사용', () => {
    const rows = [
      row({ household_name: 'A 가정', address: '첫주소' }),
      row({ household_name: 'A 가정', address: '다른주소' }),
    ];
    const plan = extractHouseholdPlan(rows, []);
    expect(plan.toCreate).toEqual([{ name: 'A 가정', address: '첫주소' }]);
  });
});
