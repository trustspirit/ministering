import type { Household } from '@/features/households/types';
import type { Member } from '@/features/members/types';
import {
  ministryLabel,
  ministryWarnings,
  summarize,
  supervisionCounts,
  filterBySupervisor,
  poolAddable,
  unassignedCandidates,
  unassignedRecipients,
  type Board,
  type BoardMinistry,
} from './board';

const today = new Date('2026-11-12');

function member(id: string, gender: 'M' | 'F', birth_date: string): Member {
  return { id, gender, birth_date } as Member;
}
function household(id: string): Household {
  return { id } as Household;
}
function ministry(over: Partial<BoardMinistry> & { id: string; number: number }): BoardMinistry {
  return { name: null, supervisorId: null, companionIds: [], recipientIds: [], ...over };
}

const m42 = member('m42', 'M', '1984-01-01');
const m17 = member('m17', 'M', '2009-06-01');
const f40 = member('f40', 'F', '1986-01-01');
const f30 = member('f30', 'F', '1996-01-01');
const f12 = member('f12', 'F', '2014-01-01');

describe('EQ board', () => {
  const households = [household('hA'), household('hB'), household('hOut')];
  const board: Board = {
    organization: 'EQ',
    presidencyIds: [],
    pool: { companionIds: ['m42'], recipientIds: ['hA', 'hB'] },
    ministries: [ministry({ id: 'x', number: 1, companionIds: ['m42'], recipientIds: ['hA'] })],
  };
  const members = [m42, m17, f40];

  it('lists unassigned candidates among EQ members', () => {
    expect(unassignedCandidates(board, members, today)).toEqual([]);
  });
  it('lists pooled households not in any ministry, and nothing outside the pool', () => {
    expect(unassignedRecipients(board, members, households, today)).toEqual([households[1]]);
  });
  it('offers households and EQ adults outside the pool to add', () => {
    expect(poolAddable(board, 'recipient', members, households, today)).toEqual([households[2]]);
    expect(poolAddable(board, 'companion', [...members, member('m50', 'M', '1976-01-01')], households, today).map((m) => m.id)).toEqual(['m50']);
  });
  it('treats an assigned household as pooled even before the pool row arrives', () => {
    const early: Board = { ...board, pool: { companionIds: [], recipientIds: [] } };
    expect(summarize(early, members, households, today).recipientTotal).toBe(1);
    expect(poolAddable(early, 'recipient', members, households, today).map((h) => h.id)).toEqual(['hB', 'hOut']);
  });
  it('summarizes', () => {
    expect(summarize(board, members, households, today)).toEqual({
      ministryCount: 1,
      recipientTotal: 2,
      recipientAssigned: 1,
      shortMinistryCount: 1,
      unassignedCandidateCount: 0,
    });
  });
  it('does not throw when companionIds hold a woman and a minor', () => {
    const odd: Board = {
      organization: 'EQ',
      presidencyIds: [],
      pool: { companionIds: [], recipientIds: [] },
      ministries: [ministry({ id: 'x', number: 1, companionIds: ['f40', 'm17'], recipientIds: ['hA'] })],
    };
    const s = summarize(odd, members, households, today);
    expect(s.shortMinistryCount).toBe(0);
    expect(ministryWarnings(odd.ministries[0]).tooFewCompanions).toBe(false);
  });
});

describe('RS board', () => {
  const board: Board = {
    organization: 'RS',
    presidencyIds: [],
    pool: { companionIds: ['f40', 'f30'], recipientIds: ['f40', 'f30'] },
    ministries: [
      ministry({ id: 'a', number: 1, companionIds: ['f40'], recipientIds: [] }),
      ministry({ id: 'b', number: 2, companionIds: [], recipientIds: ['f40'] }),
    ],
  };
  const members = [m42, f40, f30, f12];

  it('keeps the two roles apart: a sister pooled only as companion is no recipient', () => {
    const split: Board = { ...board, pool: { companionIds: ['f30'], recipientIds: [] } };
    expect(unassignedCandidates(split, members, today).map((m) => m.id)).toEqual(['f30']);
    expect(unassignedRecipients(split, members, [], today)).toEqual([]);
    expect(poolAddable(split, 'recipient', members, [], today).map((m) => m.id)).toEqual(['f30']);
  });
  it('excludes f40 from both lists, includes f30 in both, excludes f12', () => {
    const cands = unassignedCandidates(board, members, today).map((m) => m.id);
    const recips = unassignedRecipients(board, members, [], today).map((m) => m.id);
    expect(cands).toEqual(['f30']);
    expect(recips).toEqual(['f30']);
  });
  it('counts RS members as recipient total', () => {
    expect(summarize(board, members, [], today)).toEqual({
      ministryCount: 2,
      recipientTotal: 2,
      recipientAssigned: 1,
      shortMinistryCount: 2,
      unassignedCandidateCount: 1,
    });
  });
});

describe('ministryWarnings / ministryLabel', () => {
  it('warns on too few companions and no recipients', () => {
    expect(ministryWarnings({ companionIds: ['a'], recipientIds: [] } as unknown as BoardMinistry))
      .toEqual({ tooFewCompanions: true, noRecipients: true });
  });
  it('labels unnamed ministries with the official wording', () => {
    expect(ministryLabel({ number: 3, name: null })).toBe('성역 동반자 3');
    expect(ministryLabel({ number: 3, name: '북쪽' })).toBe('북쪽');
  });
});

describe('supervisionCounts', () => {
  it('counts ministries per supervisor and null for none', () => {
    const board: Board = {
      organization: 'EQ',
      presidencyIds: ['s1', 's2'],
      pool: { companionIds: [], recipientIds: [] },
      ministries: [
        ministry({ id: 'a', number: 1, supervisorId: 's1' }),
        ministry({ id: 'b', number: 2, supervisorId: 's1' }),
        ministry({ id: 'c', number: 3 }),
      ],
    };
    const counts = supervisionCounts(board);
    expect(counts.get('s1')).toBe(2);
    expect(counts.get(null)).toBe(1);
    expect(counts.get('s2')).toBeUndefined();
  });
});

describe('filterBySupervisor', () => {
  const ms = [
    ministry({ id: 'a', number: 1, supervisorId: 's1' }),
    ministry({ id: 'b', number: 2, supervisorId: 's2' }),
    ministry({ id: 'c', number: 3 }),
  ];
  it("keeps only that supervisor's ministries", () => {
    expect(filterBySupervisor(ms, 's1').map((m) => m.id)).toEqual(['a']);
  });
  it("'none' keeps unsupervised ministries", () => {
    expect(filterBySupervisor(ms, 'none').map((m) => m.id)).toEqual(['c']);
  });
  it('null keeps all', () => {
    expect(filterBySupervisor(ms, null)).toBe(ms);
  });
});
