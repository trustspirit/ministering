import type { Board } from './board';
import { applyOps } from './applyOps';
import { NEW_MINISTRY } from './resolveDrop';

const base = (): Board => ({
  organization: 'EQ',
  ministries: [
    { id: 'A', number: 1, name: null, shareToken: null, companionIds: ['m1'], recipientIds: [] },
    { id: 'B', number: 2, name: null, shareToken: null, companionIds: [], recipientIds: [] },
  ],
});
const created = { id: 'N', number: 3 };

describe('applyOps', () => {
  it('13a. applies remove + add without mutating the original', () => {
    const board = base();
    const next = applyOps(
      board,
      [
        { type: 'remove', role: 'companion', ministryId: 'A', targetId: 'm1' },
        { type: 'add', role: 'companion', ministryId: 'B', targetId: 'm1' },
      ],
      created,
    );
    expect(next.ministries[0].companionIds).toEqual([]);
    expect(next.ministries[1].companionIds).toEqual(['m1']);
    expect(board).toEqual(base());
  });

  it('13b. createMinistry appends an empty ministry and resolves NEW_MINISTRY', () => {
    const board = base();
    const next = applyOps(
      board,
      [
        { type: 'createMinistry' },
        { type: 'add', role: 'recipient', ministryId: NEW_MINISTRY, targetId: 'h9' },
      ],
      created,
    );
    expect(next.ministries).toHaveLength(3);
    expect(next.ministries[2]).toEqual({
      id: 'N',
      number: 3,
      name: null,
      shareToken: null,
      companionIds: [],
      recipientIds: ['h9'],
    });
    expect(board).toEqual(base());
  });
});
