import { describe, expect, it } from 'vitest';
import { computeHouseholdPinStyle } from './computeHouseholdPinStyle';

describe('computeHouseholdPinStyle', () => {
  it('미배정 가정 → 보라 사각형, 흰 테두리', () => {
    const s = computeHouseholdPinStyle(false);
    expect(s.background).toBe('#6366f1');
    expect(s.borderColor).toBe('#ffffff');
    expect(s.badge).toBeUndefined();
    expect(s.ring).toBe(false);
  });

  it('조원 배정 가정 → 주황 테두리 + 배지', () => {
    const s = computeHouseholdPinStyle(false, { role: 'recipient', ministryNumber: 2 });
    expect(s.borderColor).toBe('#f59e0b');
    expect(s.badge).toEqual({ text: '조', background: '#f59e0b' });
  });

  it('선택됨 → ring true', () => {
    const s = computeHouseholdPinStyle(true);
    expect(s.ring).toBe(true);
  });

  it('선택 + 배정 → 둘 다', () => {
    const s = computeHouseholdPinStyle(true, { role: 'recipient', ministryNumber: 1 });
    expect(s.ring).toBe(true);
    expect(s.borderColor).toBe('#f59e0b');
    expect(s.badge).toEqual({ text: '조', background: '#f59e0b' });
  });
});
