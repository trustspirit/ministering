import { describe, expect, it } from 'vitest';
import { ministryDisplayName } from './ministryDisplayName';

describe('ministryDisplayName', () => {
  it('name이 있으면 name 사용', () => {
    expect(ministryDisplayName({ name: '역삼동 조', number: 3 } as never)).toBe('역삼동 조');
  });
  it('name이 없으면 "조 {number}"', () => {
    expect(ministryDisplayName({ name: null, number: 5 } as never)).toBe('조 5');
  });
  it('name이 빈 문자열이면 "조 {number}" 사용', () => {
    expect(ministryDisplayName({ name: '', number: 2 } as never)).toBe('조 2');
  });
});
