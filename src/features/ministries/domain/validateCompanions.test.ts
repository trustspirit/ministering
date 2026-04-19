import { describe, expect, it } from 'vitest';
import { validateCompanions } from './validateCompanions';

const m = (p: Partial<{ gender: string; household_id: string | null; household_role: string }>) => ({
  gender: 'M' as const,
  household_id: null,
  household_role: 'other' as const,
  ...p,
}) as never;

describe('validateCompanions', () => {
  it('남 2명 → ok', () => {
    const res = validateCompanions([m({ gender: 'M' }), m({ gender: 'M' })]);
    expect(res.ok).toBe(true);
  });

  it('여 3명 → ok', () => {
    const res = validateCompanions([
      m({ gender: 'F' }),
      m({ gender: 'F' }),
      m({ gender: 'F' }),
    ]);
    expect(res.ok).toBe(true);
  });

  it('남 4명 → ok (최대)', () => {
    const res = validateCompanions(Array(4).fill(0).map(() => m({ gender: 'M' })));
    expect(res.ok).toBe(true);
  });

  it('부부 2명 (남+여) → ok', () => {
    const res = validateCompanions([
      m({ gender: 'M', household_id: 'h1', household_role: 'husband' }),
      m({ gender: 'F', household_id: 'h1', household_role: 'wife' }),
    ]);
    expect(res.ok).toBe(true);
  });

  it('1명만 → fail (code: too_few)', () => {
    const res = validateCompanions([m({ gender: 'M' })]);
    expect(res.ok).toBe(false);
    expect(res).toMatchObject({ code: 'too_few' });
  });

  it('5명 → fail (code: too_many)', () => {
    const res = validateCompanions(Array(5).fill(0).map(() => m({ gender: 'M' })));
    expect(res.ok).toBe(false);
    expect(res).toMatchObject({ code: 'too_many' });
  });

  it('부부 아닌 남+여 → fail (code: mixed_gender)', () => {
    const res = validateCompanions([
      m({ gender: 'M' }),
      m({ gender: 'F' }),
    ]);
    expect(res.ok).toBe(false);
    expect(res).toMatchObject({ code: 'mixed_gender' });
  });

  it('3명에서 이성 섞여있으면 → fail', () => {
    const res = validateCompanions([
      m({ gender: 'M' }),
      m({ gender: 'M' }),
      m({ gender: 'F' }),
    ]);
    expect(res.ok).toBe(false);
  });
});
