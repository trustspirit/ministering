import type { Household } from '@/features/households/types';
import type { Member } from '@/features/members/types';
import {
  ministryLabel,
  ministryWarnings,
  summarize,
  supervisionCounts,
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
  const households = [household('hA'), household('hB')];
  const board: Board = {
    organization: 'EQ',
    presidencyIds: [],
    ministries: [ministry({ id: 'x', number: 1, companionIds: ['m42'], recipientIds: ['hA'] })],
  };
  const members = [m42, m17, f40];

  it('lists unassigned candidates among EQ members', () => {
    expect(unassignedCandidates(board, members, today)).toEqual([]);
  });
  it('lists households not in any ministry', () => {
    expect(unassignedRecipients(board, members, households, today)).toEqual([households[1]]);
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
    ministries: [
      ministry({ id: 'a', number: 1, companionIds: ['f40'], recipientIds: [] }),
      ministry({ id: 'b', number: 2, companionIds: [], recipientIds: ['f40'] }),
    ],
  };
  const members = [m42, f40, f30, f12];

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
