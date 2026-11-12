import { describe, expect, it } from 'vitest';
import { generateShareToken, isShareTokenShape, shareUrl } from './shareToken';

describe('generateShareToken', () => {
  it('returns 64 lowercase hex characters', () => {
    expect(generateShareToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a different value each time', () => {
    expect(generateShareToken()).not.toBe(generateShareToken());
  });
});

describe('isShareTokenShape', () => {
  it('accepts only 64 lowercase hex characters', () => {
    expect(isShareTokenShape('a'.repeat(64))).toBe(true);
    expect(isShareTokenShape('a'.repeat(31))).toBe(false);
    expect(isShareTokenShape('A'.repeat(64))).toBe(false);
    expect(isShareTokenShape('g'.repeat(64))).toBe(false);
    expect(isShareTokenShape(`${'a'.repeat(64)}\n`)).toBe(false);
    expect(isShareTokenShape(undefined)).toBe(false);
  });
});

describe('shareUrl', () => {
  it('joins the origin and /s/<token>', () => {
    expect(shareUrl('abc')).toBe(`${window.location.origin}/s/abc`);
  });
});
