import { describe, expect, it } from 'vitest';
import { BP, layoutFor } from './breakpoints';

describe('layoutFor', () => {
  it.each([
    [360, 'phone'],
    [819, 'phone'],
    [820, 'tablet'],
    [1023, 'tablet'],
    [1024, 'compact'],
    [1279, 'compact'],
    [1280, 'wide'],
    [1920, 'wide'],
  ] as const)('%i → %s', (width, layout) => {
    expect(layoutFor(width)).toBe(layout);
  });

  it('uses the shared breakpoint values', () => {
    expect(BP).toEqual({ phone: 820, compact: 1024, wide: 1280 });
  });
});
