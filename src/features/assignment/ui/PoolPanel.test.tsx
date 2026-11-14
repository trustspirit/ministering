import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Board } from '../domain/board';
import { PoolPanel } from './PoolPanel';
import { household, member, renderWorkspace } from '@tests/testUtils';

const lim = member({ id: 'b1', full_name: '임재홍', gender: 'M', birth_date: '1980-04-12', household_id: 'h1' });
const kim = member({ id: 'b2', full_name: '김유명', gender: 'M', birth_date: '1975-01-01', household_id: 'h2' });
const choi = member({ id: 'b3', full_name: '최원철', gender: 'M', birth_date: '1985-03-11', household_id: 'h3' });
const teen = member({ id: 'b4', full_name: '최익재', gender: 'M', birth_date: '2012-06-04', household_id: 'h3' });
const sister = member({ id: 's1', full_name: '강아름', gender: 'F', birth_date: '1990-01-14', household_id: 'h1' });
const h1 = household({ id: 'h1', name: '임재홍 가정', address: '서울 송파구 오금로 1' });
const h2 = household({ id: 'h2', name: '김유명 가정', address: '서울 강동구 상일로 55' });
const h3 = household({ id: 'h3', name: '최원철 가정', address: null });
const members = [lim, kim, choi, teen, sister];
const households = [h1, h2, h3];

const eqBoard = (pool: Board['pool']): Board => ({
  organization: 'EQ',
  presidencyIds: [],
  pool,
  ministries: [{ id: 'x', number: 1, name: null, supervisorId: null, companionIds: ['b1'], recipientIds: ['h1'] }],
});

function renderPanel(board: Board, canEdit = true) {
  const { wrapper, value } = renderWorkspace(<PoolPanel households={households} />, {
    board,
    canEdit,
    members,
    households,
  });
  render(wrapper);
  return value;
}

describe('PoolPanel with a ministry pool', () => {
  it('lists only pooled people and households that are not assigned', () => {
    renderPanel(eqBoard({ companionIds: ['b1', 'b2'], recipientIds: ['h1', 'h2'] }));
    const pool = screen.getByRole('complementary', { name: '지명 대기 목록' });
    expect(within(pool).getByRole('button', { name: /^김유명 \d/ })).toBeInTheDocument();
    expect(within(pool).queryByRole('button', { name: /^최원철 \d/ })).toBeNull();
    expect(within(pool).getByRole('button', { name: /^김유명 가정 \d명/ })).toBeInTheDocument();
    expect(within(pool).queryByRole('button', { name: /^최원철 가정 \d명/ })).toBeNull();
  });

  it('removes an unassigned person from the pool for that role', () => {
    const value = renderPanel(eqBoard({ companionIds: ['b1', 'b2'], recipientIds: ['h1', 'h2'] }));
    fireEvent.click(screen.getByRole('button', { name: '김유명 목록에서 빼기' }));
    expect(value.actions.removeFromPool).toHaveBeenCalledWith('companion', 'b2');
    fireEvent.click(screen.getByRole('button', { name: '김유명 가정 목록에서 빼기' }));
    expect(value.actions.removeFromPool).toHaveBeenCalledWith('recipient', 'h2');
  });

  it('adds a brother: the dialog offers adult brothers outside the pool, searchable by name', () => {
    const value = renderPanel(eqBoard({ companionIds: ['b1'], recipientIds: ['h1'] }));
    fireEvent.click(screen.getByRole('button', { name: '동반자 후보 형제 추가' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: '김유명 추가' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '최원철 추가' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '임재홍 추가' })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: '최익재 추가' })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: '강아름 추가' })).toBeNull();
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: '원철' } });
    expect(within(dialog).queryByRole('button', { name: '김유명 추가' })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: '최원철 추가' }));
    expect(value.actions.addToPool).toHaveBeenCalledWith('companion', 'b3');
  });

  it('adds a household: searchable by address and by a family member’s name', () => {
    const value = renderPanel(eqBoard({ companionIds: ['b1'], recipientIds: ['h1'] }));
    fireEvent.click(screen.getByRole('button', { name: '성역 대상 가정 추가' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: '상일로' } });
    expect(within(dialog).getByRole('button', { name: '김유명 가정 추가' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '최원철 가정 추가' })).toBeNull();
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: '익재' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '최원철 가정 추가' }));
    expect(value.actions.addToPool).toHaveBeenCalledWith('recipient', 'h3');
  });

  it('shows a hint when nobody is in the pool yet', () => {
    renderPanel({ ...eqBoard({ companionIds: [], recipientIds: [] }), ministries: [] });
    expect(screen.getAllByText('목록이 비어 있습니다. 추가를 눌러 사람을 넣으세요.')).toHaveLength(2);
  });

  it('viewers see an empty pool without the hint to add', () => {
    renderPanel({ ...eqBoard({ companionIds: [], recipientIds: [] }), ministries: [] }, false);
    expect(screen.getAllByText('목록이 비어 있습니다.')).toHaveLength(2);
  });

  it('viewers get neither add nor remove', () => {
    renderPanel(eqBoard({ companionIds: ['b1', 'b2'], recipientIds: ['h1', 'h2'] }), false);
    expect(screen.queryByRole('button', { name: /추가$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /목록에서 빼기/ })).toBeNull();
  });
});
