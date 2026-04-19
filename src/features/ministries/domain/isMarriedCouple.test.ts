import { describe, expect, it } from 'vitest';
import { isMarriedCouple } from './isMarriedCouple';

const m = (p: { household_id: string | null; household_role: string }) => ({
  ...p,
  household_role: p.household_role as 'husband' | 'wife' | 'child' | 'other',
}) as never;

describe('isMarriedCouple', () => {
  it('같은 가정 husband + wife → true', () => {
    expect(isMarriedCouple(
      m({ household_id: 'h1', household_role: 'husband' }),
      m({ household_id: 'h1', household_role: 'wife' }),
    )).toBe(true);
  });
  it('순서 바뀌어도 true', () => {
    expect(isMarriedCouple(
      m({ household_id: 'h1', household_role: 'wife' }),
      m({ household_id: 'h1', household_role: 'husband' }),
    )).toBe(true);
  });
  it('다른 가정이면 false', () => {
    expect(isMarriedCouple(
      m({ household_id: 'h1', household_role: 'husband' }),
      m({ household_id: 'h2', household_role: 'wife' }),
    )).toBe(false);
  });
  it('같은 가정이지만 둘 다 husband → false', () => {
    expect(isMarriedCouple(
      m({ household_id: 'h1', household_role: 'husband' }),
      m({ household_id: 'h1', household_role: 'husband' }),
    )).toBe(false);
  });
  it('child나 other면 false', () => {
    expect(isMarriedCouple(
      m({ household_id: 'h1', household_role: 'husband' }),
      m({ household_id: 'h1', household_role: 'child' }),
    )).toBe(false);
  });
  it('household_id가 null이면 false', () => {
    expect(isMarriedCouple(
      m({ household_id: null, household_role: 'husband' }),
      m({ household_id: null, household_role: 'wife' }),
    )).toBe(false);
  });
});
