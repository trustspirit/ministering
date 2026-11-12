import { describe, it, expect } from 'vitest';
import { defaultAssignmentPath } from './defaultPath';

describe('defaultAssignmentPath', () => {
  it('sends the RS president to the RS board', () => {
    expect(defaultAssignmentPath('rs_president')).toBe('/assignments/rs');
  });
  it('sends everyone else to the EQ board', () => {
    expect(defaultAssignmentPath('eq_president')).toBe('/assignments/eq');
    expect(defaultAssignmentPath('bishopric')).toBe('/assignments/eq');
    expect(defaultAssignmentPath('viewer')).toBe('/assignments/eq');
    expect(defaultAssignmentPath(null)).toBe('/assignments/eq');
    expect(defaultAssignmentPath(undefined)).toBe('/assignments/eq');
  });
});
