import { describe, expect, it } from 'vitest';
import { validateDisplayName } from './displayName';

describe('validateDisplayName', () => {
  it('accepts ordinary names and returns them trimmed', () => {
    expect(validateDisplayName('  김철수 ')).toEqual({ ok: true, name: '김철수' });
    expect(validateDisplayName('가'.repeat(50)).ok).toBe(true);
    expect(validateDisplayName('😀'.repeat(50)).ok).toBe(true);
  });

  it('requires a name', () => {
    expect(validateDisplayName('')).toEqual({ ok: false, reason: 'required' });
    expect(validateDisplayName('   ')).toEqual({ ok: false, reason: 'required' });
  });

  it('counts characters, not UTF-16 units, against the 50 limit', () => {
    expect(validateDisplayName('가'.repeat(51))).toEqual({ ok: false, reason: 'tooLong' });
    expect(validateDisplayName('😀'.repeat(51))).toEqual({ ok: false, reason: 'tooLong' });
  });

  it.each(['\u0007', '\n', '\u007f', '‮', '‪', '⁦', '⁩'])(
    'refuses control and bidi character %j',
    (ch) => {
      expect(validateDisplayName(`김${ch}철수`)).toEqual({ ok: false, reason: 'unsafe' });
    },
  );
});
