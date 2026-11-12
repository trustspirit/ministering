import { sortFamily } from './familyOrder';

type M = { name: string; household_role: 'husband' | 'wife' | 'child' | 'other'; birth_date: string };

describe('sortFamily', () => {
  it('orders husband, wife, then others by birth date ascending', () => {
    const input: M[] = [
      { name: 'child2014', household_role: 'child', birth_date: '2014-01-01' },
      { name: 'wife', household_role: 'wife', birth_date: '1985-01-01' },
      { name: 'other1950', household_role: 'other', birth_date: '1950-01-01' },
      { name: 'husband', household_role: 'husband', birth_date: '1983-01-01' },
      { name: 'child2010', household_role: 'child', birth_date: '2010-01-01' },
    ];
    expect(sortFamily(input).map((m) => m.name)).toEqual([
      'husband', 'wife', 'other1950', 'child2010', 'child2014',
    ]);
  });
  it('does not mutate the input', () => {
    const input: M[] = [
      { name: 'w', household_role: 'wife', birth_date: '1985-01-01' },
      { name: 'h', household_role: 'husband', birth_date: '1983-01-01' },
    ];
    sortFamily(input);
    expect(input[0].name).toBe('w');
  });
  it('returns [] for empty input', () => {
    expect(sortFamily([])).toEqual([]);
  });
});
