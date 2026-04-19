import { describe, expect, it } from 'vitest';
import { nextMinistryNumber } from './nextMinistryNumber';

describe('nextMinistryNumber', () => {
  it('빈 목록이면 1', () => {
    expect(nextMinistryNumber([])).toBe(1);
  });
  it('연속된 번호면 다음 번호', () => {
    expect(nextMinistryNumber([1, 2, 3])).toBe(4);
  });
  it('gap이 있으면 가장 작은 빈 번호', () => {
    expect(nextMinistryNumber([1, 3, 5])).toBe(2);
  });
  it('1이 빠져있으면 1', () => {
    expect(nextMinistryNumber([2, 3, 4])).toBe(1);
  });
  it('중간 gap 여러 개면 가장 작은 것', () => {
    expect(nextMinistryNumber([1, 2, 4, 6, 7])).toBe(3);
  });
  it('순서 섞여있어도 동작', () => {
    expect(nextMinistryNumber([5, 1, 3])).toBe(2);
  });
  it('중복 있어도 무시', () => {
    expect(nextMinistryNumber([1, 1, 2, 2])).toBe(3);
  });
});
