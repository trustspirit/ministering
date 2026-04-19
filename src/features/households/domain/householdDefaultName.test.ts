import { describe, expect, it } from 'vitest';
import { householdDefaultName } from './householdDefaultName';

const member = (p: Partial<{ full_name: string; household_role: string; birth_date: string; gender: string }>) => ({
  full_name: 'X',
  household_role: 'other' as const,
  birth_date: '2000-01-01',
  gender: 'M' as const,
  ...p,
}) as never;

describe('householdDefaultName', () => {
  it('husband가 있으면 husband 이름 사용', () => {
    const members = [
      member({ full_name: '김성도', household_role: 'husband' }),
      member({ full_name: '이자매', household_role: 'wife' }),
    ];
    expect(householdDefaultName(members)).toBe('김성도 가정');
  });
  it('husband가 없고 wife가 있으면 wife 이름', () => {
    const members = [member({ full_name: '박자매', household_role: 'wife' })];
    expect(householdDefaultName(members)).toBe('박자매 가정');
  });
  it('husband/wife 모두 없으면 가장 나이 많은 성인 (18세 이상) 이름', () => {
    const members = [
      member({ full_name: '어린자녀', household_role: 'child', birth_date: '2015-01-01' }),
      member({ full_name: '성인자녀', household_role: 'child', birth_date: '2005-01-01' }),
    ];
    expect(householdDefaultName(members, new Date('2026-04-20'))).toBe('성인자녀 가정');
  });
  it('성인이 없으면 첫 구성원 이름', () => {
    const members = [member({ full_name: '유일한자녀', household_role: 'child', birth_date: '2018-01-01' })];
    expect(householdDefaultName(members, new Date('2026-04-20'))).toBe('유일한자녀 가정');
  });
  it('빈 배열이면 "새 가정"', () => {
    expect(householdDefaultName([])).toBe('새 가정');
  });
});
