import { describe, expect, it } from 'vitest';
import { clampSideWidth, poolWidthFor } from './clampSideWidth';

describe('clampSideWidth', () => {
  it('resolves vw against the work width when it fits', () => {
    expect(clampSideWidth('45vw', 1100, 240)).toBeCloseTo(495);
    expect(clampSideWidth('45vw', 1024, 240)).toBeCloseTo(460.8);
  });

  it('caps the map so the companionship column keeps 300px', () => {
    expect(clampSideWidth('800px', 1100, 240)).toBe(553);
    expect(clampSideWidth('60vw', 1280, 286)).toBe(687);
  });

  it('never goes below 300px', () => {
    expect(clampSideWidth('10vw', 1440, 286)).toBe(300);
    expect(clampSideWidth('120px', 1440, 286)).toBe(300);
  });

  it('keeps the approved desktop widths unchanged', () => {
    expect(clampSideWidth('45vw', 1280, 286)).toBe(576);
    expect(clampSideWidth('45vw', 1440, 286)).toBe(648);
    expect(clampSideWidth('45vw', 1920, 286)).toBe(864);
  });

  it('returns the 300px floor when the window has no room above the minimums', () => {
    // 800 < 240 + 7 + 300 + 300: the cap would be 253px, the floor wins
    expect(clampSideWidth('45vw', 800, 240)).toBe(300);
    expect(clampSideWidth('600px', 892, 286)).toBe(300);
  });

  it('falls back to the default width for an unreadable value', () => {
    expect(clampSideWidth('wide', 1440, 286)).toBe(648);
  });
});

describe('poolWidthFor', () => {
  it('is 286px on wide windows and 240px below 1280px', () => {
    expect(poolWidthFor(1280)).toBe(286);
    expect(poolWidthFor(1279)).toBe(240);
    expect(poolWidthFor(1024)).toBe(240);
  });
});
