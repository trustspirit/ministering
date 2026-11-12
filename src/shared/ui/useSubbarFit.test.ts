import { describe, expect, it } from 'vitest';
import { subbarFit } from './useSubbarFit';

describe('subbarFit', () => {
  it('keeps everything while the bar takes one or two rows', () => {
    expect(subbarFit(36)).toBeNull();
    expect(subbarFit(57)).toBeNull();
    expect(subbarFit(70)).toBeNull();
  });

  it('hides the legend once everything would need a third row', () => {
    expect(subbarFit(71)).toBe('tight');
    expect(subbarFit(83)).toBe('tight');
  });
});
