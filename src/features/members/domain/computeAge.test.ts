import { describe, expect, it } from 'vitest';
import { computeAge } from './computeAge';

describe('computeAge', () => {
  it('생일이 지났으면 올해 나이', () => {
    expect(computeAge(new Date('1990-03-15'), new Date('2026-04-20'))).toBe(36);
  });
  it('생일이 아직 안 지났으면 한 살 어림', () => {
    expect(computeAge(new Date('1990-05-15'), new Date('2026-04-20'))).toBe(35);
  });
  it('오늘이 생일이면 나이 증가', () => {
    expect(computeAge(new Date('1990-04-20'), new Date('2026-04-20'))).toBe(36);
  });
  it('오늘이 생일 전날이면 아직 옛 나이', () => {
    expect(computeAge(new Date('1990-04-21'), new Date('2026-04-20'))).toBe(35);
  });
  it('문자열 날짜도 허용', () => {
    expect(computeAge('1990-03-15', '2026-04-20')).toBe(36);
  });
});
