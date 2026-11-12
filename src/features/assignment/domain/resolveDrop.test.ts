import type { Member } from '@/features/members/types';
import type { Board, BoardMinistry } from './board';
import { NEW_MINISTRY, resolveDrop, type DragItem, type DropTarget } from './resolveDrop';

const today = new Date('2026-11-12');

function member(id: string, gender: 'M' | 'F', birth_date: string, household_id = `h-${id}`): Member {
  return { id, gender, birth_date, household_id, household_role: null } as unknown as Member;
}
function ministry(over: Partial<BoardMinistry> & { id: string; number: number }): BoardMinistry {
  return { name: null, shareToken: null, companionIds: [], recipientIds: [], ...over };
}

const m1 = member('m1', 'M', '1984-01-01');
const m2 = member('m2', 'M', '1986-01-01');
const m3 = member('m3', 'M', '1988-01-01');
const m4 = member('m4', 'M', '1990-01-01');
const m5 = member('m5', 'M', '1992-01-01');
const m6 = member('m6', 'M', '1994-01-01');
const m17 = member('m17', 'M', '2009-06-01');
const f40 = member('f40', 'F', '1986-01-01');
const f30 = member('f30', 'F', '1996-01-01');
const f31 = member('f31', 'F', '1995-01-01');
const f12 = member('f12', 'F', '2014-01-01');
const members = [m1, m2, m3, m4, m5, m6, m17, f40, f30, f31, f12];

const eq = (ms: BoardMinistry[]): Board => ({ organization: 'EQ', ministries: ms });
const rs = (ms: BoardMinistry[]): Board => ({ organization: 'RS', ministries: ms });
const at = (ministryId: string, zone: 'companion' | 'recipient' | null = null): DropTarget => ({
  type: 'ministry',
  ministryId,
  zone,
});
const mem = (id: string, from: DragItem['from'] = null): DragItem => ({ kind: 'member', id, from });
const hh = (id: string, from: DragItem['from'] = null): DragItem => ({ kind: 'household', id, from });
const run = (board: Board, item: DragItem, target: DropTarget) =>
  resolveDrop({ board, item, target, members, today });

describe('resolveDrop', () => {
  it('1. EQ unassigned brother -> ministry A', () => {
    const board = eq([ministry({ id: 'A', number: 1 })]);
    expect(run(board, mem('m1', 'companion'), at('A', 'companion'))).toEqual({
      ok: true,
      ops: [{ type: 'add', role: 'companion', ministryId: 'A', targetId: 'm1' }],
    });
  });

  it('2. EQ brother A -> B is remove + add', () => {
    const board = eq([
      ministry({ id: 'A', number: 1, companionIds: ['m1'] }),
      ministry({ id: 'B', number: 2 }),
    ]);
    expect(run(board, mem('m1', 'companion'), at('B'))).toEqual({
      ok: true,
      ops: [
        { type: 'remove', role: 'companion', ministryId: 'A', targetId: 'm1' },
        { type: 'add', role: 'companion', ministryId: 'B', targetId: 'm1' },
      ],
    });
  });

  it('3. EQ household onto ministry title (zone null) adds recipient', () => {
    const board = eq([ministry({ id: 'A', number: 1 })]);
    expect(run(board, hh('h9'), at('A'))).toEqual({
      ok: true,
      ops: [{ type: 'add', role: 'recipient', ministryId: 'A', targetId: 'h9' }],
    });
  });

  it('4. EQ household -> new creates ministry', () => {
    const board = eq([ministry({ id: 'A', number: 1 })]);
    expect(run(board, hh('h9'), { type: 'new' })).toEqual({
      ok: true,
      ops: [
        { type: 'createMinistry' },
        { type: 'add', role: 'recipient', ministryId: NEW_MINISTRY, targetId: 'h9' },
      ],
    });
  });

  it('5. EQ brother -> pool removes; unassigned -> pool is no-op', () => {
    const board = eq([ministry({ id: 'A', number: 1, companionIds: ['m1'] })]);
    expect(run(board, mem('m1', 'companion'), { type: 'pool' })).toEqual({
      ok: true,
      ops: [{ type: 'remove', role: 'companion', ministryId: 'A', targetId: 'm1' }],
    });
    expect(run(board, mem('m2', 'companion'), { type: 'pool' })).toEqual({ ok: true, ops: [] });
  });

  it('6. fifth companion rejected; already-in ministry is no-op', () => {
    const board = eq([ministry({ id: 'A', number: 1, companionIds: ['m1', 'm2', 'm3', 'm4'] })]);
    expect(run(board, mem('m5'), at('A', 'companion'))).toEqual({
      ok: false,
      message: '성역자는 최대 4명입니다',
    });
    expect(run(board, mem('m1', 'companion'), at('A', 'companion'))).toEqual({ ok: true, ops: [] });
  });

  it('7. EQ self-assignment rejected in both directions', () => {
    const own = eq([ministry({ id: 'A', number: 1, companionIds: ['m1'] })]);
    expect(run(own, hh('h-m1'), at('A'))).toEqual({
      ok: false,
      message: '성역자 자신의 가정에는 지명할 수 없습니다',
    });
    const rev = eq([ministry({ id: 'A', number: 1, recipientIds: ['h-m1'] })]);
    expect(run(rev, mem('m1', 'companion'), at('A', 'companion'))).toEqual({
      ok: false,
      message: '성역자 자신의 가정에는 지명할 수 없습니다',
    });
  });

  it('8. EQ rejects 17-year-old male and adult woman as companion', () => {
    const board = eq([ministry({ id: 'A', number: 1 })]);
    const msg = '장로 정원회 회원만 성역자가 될 수 있습니다';
    expect(run(board, mem('m17'), at('A', 'companion'))).toEqual({ ok: false, message: msg });
    expect(run(board, mem('f40'), at('A', 'companion'))).toEqual({ ok: false, message: msg });
  });

  it('9. RS zone decides role; pin without zone rejected', () => {
    const board = rs([ministry({ id: 'A', number: 1 })]);
    expect(run(board, mem('f30'), at('A', 'recipient'))).toEqual({
      ok: true,
      ops: [{ type: 'add', role: 'recipient', ministryId: 'A', targetId: 'f30' }],
    });
    expect(run(board, mem('f30', 'companion'), at('A'))).toEqual({
      ok: true,
      ops: [{ type: 'add', role: 'companion', ministryId: 'A', targetId: 'f30' }],
    });
    expect(run(board, mem('f30', null), at('A'))).toEqual({
      ok: false,
      message: '자매 성역자 칸이나 지명된 자매 칸에 놓아 주세요',
    });
  });

  it('10. RS self-assignment rejected, cross-ministry allowed', () => {
    const board = rs([
      ministry({ id: 'A', number: 1, companionIds: ['f30', 'f31'] }),
      ministry({ id: 'B', number: 2 }),
    ]);
    expect(run(board, mem('f30', 'companion'), at('A', 'recipient'))).toEqual({
      ok: false,
      message: '자기 자신에게 지명될 수 없습니다',
    });
    expect(run(board, mem('f30', 'companion'), at('B', 'recipient'))).toEqual({
      ok: true,
      ops: [{ type: 'add', role: 'recipient', ministryId: 'B', targetId: 'f30' }],
    });
  });

  it('11. RS rejects a 12-year-old as recipient', () => {
    const board = rs([ministry({ id: 'A', number: 1 })]);
    expect(run(board, mem('f12'), at('A', 'recipient'))).toEqual({
      ok: false,
      message: '성인 자매에게만 지명할 수 있습니다',
    });
  });

  it('12. ineligible legacy companion is ignored in validation', () => {
    const board = eq([ministry({ id: 'A', number: 1, companionIds: ['f40'] })]);
    expect(run(board, mem('f40', 'companion'), { type: 'pool' })).toEqual({
      ok: true,
      ops: [{ type: 'remove', role: 'companion', ministryId: 'A', targetId: 'f40' }],
    });
    expect(run(board, mem('m1'), at('A', 'companion'))).toEqual({
      ok: true,
      ops: [{ type: 'add', role: 'companion', ministryId: 'A', targetId: 'm1' }],
    });
  });
});
