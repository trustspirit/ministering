import { describe, expect, it } from 'vitest';
import type { Board } from '@/features/assignment/domain/board';
import { buildMinistryInfo } from './ministryInfo';

const eq: Board = {
  organization: 'EQ',
  presidencyIds: [],
  pool: { companionIds: [], recipientIds: [] },
  ministries: [
    { id: 'm1', number: 1, name: null, supervisorId: null, companionIds: ['a', 'b'], recipientIds: ['h1'] },
    { id: 'm2', number: 2, name: '새벽반', supervisorId: null, companionIds: ['c'], recipientIds: ['h1', 'h2'] },
  ],
};
const rs: Board = {
  organization: 'RS',
  presidencyIds: [],
  pool: { companionIds: [], recipientIds: [] },
  ministries: [{ id: 'm3', number: 1, name: null, supervisorId: null, companionIds: ['s1'], recipientIds: ['s2'] }],
};

describe('buildMinistryInfo', () => {
  it('maps companions, assigned households and assigned sisters to ministry labels', () => {
    const info = buildMinistryInfo(eq, rs);
    expect(info.serves.get('a')).toBe('성역 동반자 1');
    expect(info.serves.get('c')).toBe('새벽반');
    expect(info.serves.get('s1')).toBe('성역 동반자 1');
    expect(info.householdAssigned.get('h1')).toBe('성역 동반자 1, 새벽반');
    expect(info.householdAssigned.get('h2')).toBe('새벽반');
    expect(info.memberAssigned.get('s2')).toBe('성역 동반자 1');
  });

  it('tolerates boards that have not loaded yet', () => {
    const info = buildMinistryInfo(undefined, undefined);
    expect(info.serves.size + info.householdAssigned.size + info.memberAssigned.size).toBe(0);
  });
});
