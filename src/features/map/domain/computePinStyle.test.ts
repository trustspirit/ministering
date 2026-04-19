import { describe, expect, it } from 'vitest';
import { computePinStyle } from './computePinStyle';

describe('computePinStyle', () => {
  it('남자 활동 미선택 → 파란 원, 흰 테두리, 불투명', () => {
    const s = computePinStyle({ gender: 'M', active_status: 'active' }, false);
    expect(s.background).toBe('#3b82f6');
    expect(s.borderColor).toBe('#ffffff');
    expect(s.opacity).toBe(1);
    expect(s.ring).toBe(false);
  });

  it('여자 활동 → 분홍 원', () => {
    const s = computePinStyle({ gender: 'F', active_status: 'active' }, false);
    expect(s.background).toBe('#ec4899');
  });

  it('저활동 → 투명도 0.45', () => {
    const s = computePinStyle({ gender: 'M', active_status: 'less_active' }, false);
    expect(s.opacity).toBe(0.45);
  });

  it('선택됨 → ring true', () => {
    const s = computePinStyle({ gender: 'M', active_status: 'active' }, true);
    expect(s.ring).toBe(true);
  });

  it('저활동 선택 → 투명도와 ring 모두', () => {
    const s = computePinStyle({ gender: 'F', active_status: 'less_active' }, true);
    expect(s.opacity).toBe(0.45);
    expect(s.ring).toBe(true);
  });
});

describe('computePinStyle — assignment status', () => {
  it('동반자 배정 → 초록 테두리 + "동" 배지', () => {
    const s = computePinStyle(
      { gender: 'M', active_status: 'active' },
      false,
      { role: 'companion', ministryNumber: 3 },
    );
    expect(s.borderColor).toBe('#10b981');
    expect(s.badge).toEqual({ text: '동', background: '#10b981' });
  });

  it('조원 배정 → 주황 테두리 + "조" 배지', () => {
    const s = computePinStyle(
      { gender: 'F', active_status: 'active' },
      false,
      { role: 'recipient', ministryNumber: 2 },
    );
    expect(s.borderColor).toBe('#f59e0b');
    expect(s.badge).toEqual({ text: '조', background: '#f59e0b' });
  });

  it('미배정 → badge undefined', () => {
    const s = computePinStyle(
      { gender: 'M', active_status: 'active' },
      false,
    );
    expect(s.badge).toBeUndefined();
  });

  it('배정 + 선택 → ring + 테두리 모두', () => {
    const s = computePinStyle(
      { gender: 'M', active_status: 'active' },
      true,
      { role: 'companion', ministryNumber: 1 },
    );
    expect(s.ring).toBe(true);
    expect(s.borderColor).toBe('#10b981');
  });
});
