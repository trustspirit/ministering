import type { Household } from '@/features/households/types';
import type { Member } from '@/features/members/types';
import type { Board, BoardMinistry } from './board';
import { buildMapItems, hotLines, type MapItem } from './mapItems';

const today = new Date('2026-11-12');

function member(
  id: string,
  over: Partial<Member> & Pick<Member, 'gender' | 'birth_date'>,
): Member {
  return {
    id,
    full_name: id,
    household_id: null,
    lat: null,
    lng: null,
    active_status: 'active',
    ...over,
  } as Member;
}
function household(id: string, lat: number | null, lng: number | null): Household {
  return { id, name: `${id} 가정`, lat, lng } as Household;
}
function ministry(over: Partial<BoardMinistry> & { id: string; number: number }): BoardMinistry {
  return { name: null, shareToken: null, companionIds: [], recipientIds: [], ...over };
}

const hA = household('hA', 37.5, 127.0);
const hB = household('hB', null, null);
const hC = household('hC', 37.6, 126.9);

const m42 = member('m42', { gender: 'M', birth_date: '1984-01-01', lat: 37.51, lng: 127.01, household_id: 'hA' });
/** No own coordinates: falls back to household hC. */
const m50 = member('m50', { gender: 'M', birth_date: '1976-01-01', household_id: 'hC', active_status: 'less_active' });
/** No coordinates anywhere. */
const m30 = member('m30', { gender: 'M', birth_date: '1996-01-01', household_id: 'hB' });
const m17 = member('m17', { gender: 'M', birth_date: '2009-06-01', lat: 37.52, lng: 127.02 });
const f40 = member('f40', { gender: 'F', birth_date: '1986-01-01', lat: 37.53, lng: 127.03, active_status: 'new_member' });
const f35 = member('f35', { gender: 'F', birth_date: '1991-01-01', household_id: 'hC' });
const f12 = member('f12', { gender: 'F', birth_date: '2014-01-01', lat: 37.54, lng: 127.04 });

const members = [m42, m50, m30, m17, f40, f35, f12];
const households = [hA, hB, hC];

const ids = (items: MapItem[]) => items.map((i) => `${i.kind}:${i.id}`);

describe('buildMapItems — EQ', () => {
  const board: Board = {
    organization: 'EQ',
    ministries: [
      ministry({ id: 'x', number: 1, companionIds: ['m42'], recipientIds: ['hC'] }),
      ministry({ id: 'y', number: 3, companionIds: ['m50'], recipientIds: ['hA', 'hB'] }),
    ],
  };
  const items = buildMapItems({ board, members, households, today });

  it('keeps households and EQ members with coordinates, without throwing on missing ones', () => {
    expect(ids(items)).toEqual(['household:hA', 'household:hC', 'member:m42', 'member:m50']);
  });
  it('excludes women and members under 18', () => {
    expect(ids(items)).not.toContain('member:f40');
    expect(ids(items)).not.toContain('member:m17');
  });
  it('uses the household coordinates when the member has none', () => {
    const m = items.find((i) => i.id === 'm50')!;
    expect([m.lat, m.lng]).toEqual([37.6, 126.9]);
  });
  it('takes companion and recipient numbers from the board', () => {
    const by = (id: string) => items.find((i) => i.id === id)!;
    expect(by('m42')).toMatchObject({ companionNo: 1, recipientNo: null, label: 'm42' });
    expect(by('m50')).toMatchObject({ companionNo: 3, recipientNo: null, lessActive: true });
    expect(by('hA')).toMatchObject({ companionNo: null, recipientNo: 3, label: 'hA 가정' });
    expect(by('hC')).toMatchObject({ companionNo: null, recipientNo: 1 });
  });
});

describe('buildMapItems — RS', () => {
  const board: Board = {
    organization: 'RS',
    ministries: [ministry({ id: 'r', number: 2, companionIds: ['f40'], recipientIds: ['f35'] })],
  };
  const items = buildMapItems({ board, members, households, today });

  it('shows only RS members (no households, men or girls)', () => {
    expect(ids(items)).toEqual(['member:f40', 'member:f35']);
  });
  it('uses household coordinates as fallback and board numbers', () => {
    const f35Item = items.find((i) => i.id === 'f35')!;
    expect(f35Item).toMatchObject({ lat: 37.6, lng: 126.9, companionNo: null, recipientNo: 2 });
    expect(items.find((i) => i.id === 'f40')).toMatchObject({
      companionNo: 2,
      recipientNo: null,
      newMember: true,
      lessActive: false,
    });
  });
});

describe('hotLines', () => {
  const board: Board = {
    organization: 'EQ',
    ministries: [
      ministry({ id: 'x', number: 1, companionIds: ['m42', 'm30'], recipientIds: ['hA', 'hB', 'hC'] }),
      ministry({ id: 'y', number: 2, companionIds: ['m50'], recipientIds: [] }),
    ],
  };
  const items = buildMapItems({ board, members, households, today });

  it('returns [] when nothing is highlighted', () => {
    expect(hotLines(board, null, items)).toEqual([]);
  });
  it('returns [] for an unknown ministry', () => {
    expect(hotLines(board, 'nope', items)).toEqual([]);
  });
  it('joins each companion with each recipient of the highlighted ministry, skipping pairs off the map', () => {
    const pairs = hotLines(board, 'x', items).map((l) => `${l.from.id}-${l.to.id}`);
    expect(pairs).toEqual(['m42-hA', 'm42-hC']);
  });
  it('joins RS companions to recipient members', () => {
    const rs: Board = {
      organization: 'RS',
      ministries: [ministry({ id: 'r', number: 2, companionIds: ['f40'], recipientIds: ['f35', 'f12'] })],
    };
    const rsItems = buildMapItems({ board: rs, members, households, today });
    expect(hotLines(rs, 'r', rsItems).map((l) => `${l.from.id}-${l.to.id}`)).toEqual(['f40-f35']);
  });
});
