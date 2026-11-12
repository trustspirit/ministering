import { describe, expect, it } from 'vitest';
import type { Member } from '@/features/members/types';
import type { Board, BoardMinistry } from './board';
import { assignOptions, canBeAssigned } from './assignOptions';

const ministry = (over: Partial<BoardMinistry> & { id: string; number: number }): BoardMinistry => ({
  name: null,
  companionIds: [],
  recipientIds: [],
  ...over,
});
const eq = (ministries: BoardMinistry[]): Board => ({ organization: 'EQ', ministries });
const rs = (ministries: BoardMinistry[]): Board => ({ organization: 'RS', ministries });
const two = [ministry({ id: 'g1', number: 1 }), ministry({ id: 'g2', number: 2, name: '시내' })];

describe('assignOptions', () => {
  it('EQ: one option per ministry plus a new ministry', () => {
    const options = assignOptions(eq(two), { kind: 'household', id: 'h1' });
    expect(options.map((o) => o.label)).toEqual([
      '성역 동반자 1에 지명',
      '시내에 지명',
      '새 성역 동반자 만들기',
    ]);
    expect(options[0].target).toEqual({ type: 'ministry', ministryId: 'g1', zone: null });
    expect(options[2].target).toEqual({ type: 'new' });
  });

  it('EQ: only the new-ministry option when there are no ministries', () => {
    expect(assignOptions(eq([]), { kind: 'member', id: 'm1' })).toEqual([
      { label: '새 성역 동반자 만들기', target: { type: 'new' }, from: null },
    ]);
  });

  it('RS: companion and recipient zone per ministry plus a new ministry as companion', () => {
    const options = assignOptions(rs(two), { kind: 'member', id: 'f1' });
    expect(options.map((o) => o.label)).toEqual([
      '성역 동반자 1의 성역자로',
      '성역 동반자 1에게 지명',
      '시내의 성역자로',
      '시내에게 지명',
      '새 성역 동반자의 성역자로',
    ]);
    expect(options.map((o) => o.target)).toEqual([
      { type: 'ministry', ministryId: 'g1', zone: 'companion' },
      { type: 'ministry', ministryId: 'g1', zone: 'recipient' },
      { type: 'ministry', ministryId: 'g2', zone: 'companion' },
      { type: 'ministry', ministryId: 'g2', zone: 'recipient' },
      { type: 'new' },
    ]);
  });

  it('skips pending ministries', () => {
    const board = eq([ministry({ id: 'tmp-1', number: 3 }), ministry({ id: 'g1', number: 1 })]);
    expect(assignOptions(board, { kind: 'household', id: 'h1' }).map((o) => o.label)).toEqual([
      '성역 동반자 1에 지명',
      '새 성역 동반자 만들기',
    ]);
  });

  it('skips the ministry the item already holds in that role', () => {
    const board = eq([ministry({ id: 'g1', number: 1, recipientIds: ['h1'] }), ministry({ id: 'g2', number: 2 })]);
    expect(assignOptions(board, { kind: 'household', id: 'h1' }).map((o) => o.label)).toEqual([
      '성역 동반자 2에 지명',
      '새 성역 동반자 만들기',
    ]);
  });

  it('RS: a companion of a ministry can still be assigned there as a recipient (and vice versa)', () => {
    const board = rs([ministry({ id: 'g1', number: 1, companionIds: ['f1'] })]);
    expect(assignOptions(board, { kind: 'member', id: 'f1' }).map((o) => o.label)).toEqual([
      '성역 동반자 1에게 지명',
      '새 성역 동반자의 성역자로',
    ]);
  });
});

describe('canBeAssigned', () => {
  const today = new Date('2026-11-12');
  const m = (gender: 'M' | 'F', birth_date: string) => ({ gender, birth_date }) as Member;
  const brother = m('M', '1986-01-01');
  const sister = m('F', '1986-01-01');
  const boy = m('M', '2014-01-01');

  it('EQ: households and elders quorum members only', () => {
    expect(canBeAssigned('EQ', { kind: 'household' })).toBe(true);
    expect(canBeAssigned('EQ', { kind: 'member' }, brother, today)).toBe(true);
    expect(canBeAssigned('EQ', { kind: 'member' }, boy, today)).toBe(false);
    expect(canBeAssigned('EQ', { kind: 'member' }, sister, today)).toBe(false);
  });

  it('RS: relief society members only, never households', () => {
    expect(canBeAssigned('RS', { kind: 'household' })).toBe(false);
    expect(canBeAssigned('RS', { kind: 'member' }, sister, today)).toBe(true);
    expect(canBeAssigned('RS', { kind: 'member' }, brother, today)).toBe(false);
  });
});
