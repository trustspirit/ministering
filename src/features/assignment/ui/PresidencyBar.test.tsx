import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Board, BoardMinistry } from '../domain/board';
import { useWorkspaceStore } from '../store';
import { PresidencyBar } from './PresidencyBar';
import { member, renderWorkspace } from '@tests/testUtils';

const lim = member({ id: 'p1', full_name: '임재홍', gender: 'M', birth_date: '1980-04-12' });
const kim = member({ id: 'p2', full_name: '김유명', gender: 'M', birth_date: '1975-01-01' });
const choi = member({ id: 'c1', full_name: '최원철', gender: 'M', birth_date: '1985-03-11' });
const teen = member({ id: 't1', full_name: '최익재', gender: 'M', birth_date: '2012-06-04' });
const sister = member({ id: 'f1', full_name: '강아름', gender: 'F', birth_date: '1990-01-14' });
const members = [lim, kim, choi, teen, sister];

function ministry(id: string, number: number, supervisorId: string | null): BoardMinistry {
  return { id, number, name: null, supervisorId, companionIds: [], recipientIds: [] };
}

function board(ministries: BoardMinistry[], presidencyIds = ['p1', 'p2']): Board {
  return { organization: 'EQ', presidencyIds, pool: { companionIds: [], recipientIds: [] }, ministries };
}

function renderBar(b: Board, canEdit = true) {
  const { wrapper, value } = renderWorkspace(<PresidencyBar />, { board: b, canEdit, members });
  const view = render(wrapper);
  return { value, view };
}

afterEach(() => useWorkspaceStore.getState().setSupervisorFilter(null));

describe('PresidencyBar', () => {
  it('shows a chip per president with the number of ministries they supervise', () => {
    renderBar(board([ministry('a', 1, 'p1'), ministry('b', 2, 'p1'), ministry('c', 3, 'p2')]));
    expect(screen.getByRole('button', { name: '임재홍 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '김유명 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전체 3' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking a chip filters, clicking again clears', () => {
    renderBar(board([ministry('a', 1, 'p1')]));
    fireEvent.click(screen.getByRole('button', { name: '임재홍 1' }));
    expect(useWorkspaceStore.getState().supervisorFilter).toBe('p1');
    fireEvent.click(screen.getByRole('button', { name: '임재홍 1' }));
    expect(useWorkspaceStore.getState().supervisorFilter).toBeNull();
  });

  it('shows 담당 없음 only when some ministry has no supervisor', () => {
    const { view } = renderBar(board([ministry('a', 1, 'p1')]));
    expect(screen.queryByRole('button', { name: /담당 없음/ })).toBeNull();
    view.unmount();
    renderBar(board([ministry('a', 1, 'p1'), ministry('b', 2, null)]));
    expect(screen.getByRole('button', { name: '담당 없음 1' })).toBeInTheDocument();
  });

  it('hides 회장단 편집 for viewers', () => {
    renderBar(board([]), false);
    expect(screen.queryByRole('button', { name: '회장단 편집' })).toBeNull();
  });

  it('the dialog lists only adult members of the organization as candidates', () => {
    renderBar(board([], ['p1']));
    fireEvent.click(screen.getByRole('button', { name: '회장단 편집' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: '김유명 추가' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '최원철 추가' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '최익재 추가' })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: '강아름 추가' })).toBeNull();
    expect(within(dialog).getByRole('button', { name: '임재홍 빼기' })).toBeInTheDocument();
  });

  it('adds and removes presidency members through the board actions', () => {
    const { value } = renderBar(board([], ['p1']));
    fireEvent.click(screen.getByRole('button', { name: '회장단 편집' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '최원철 추가' }));
    expect(value.actions.addPresident).toHaveBeenCalledWith('c1');
    fireEvent.click(within(dialog).getByRole('button', { name: '임재홍 빼기' }));
    expect(value.actions.removePresident).toHaveBeenCalledWith('p1');
  });

  it('asks once before removing someone who still supervises ministries', () => {
    const { value } = renderBar(board([ministry('a', 1, 'p1')], ['p1']));
    fireEvent.click(screen.getByRole('button', { name: '회장단 편집' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '임재홍 빼기' }));
    expect(value.actions.removePresident).not.toHaveBeenCalled();
    expect(within(dialog).getByText('임재홍 님이 담당하던 조 1개는 담당 없음이 됩니다.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '빼기 확인' }));
    expect(value.actions.removePresident).toHaveBeenCalledWith('p1');
  });

  it('clears the filter when the filtered president is no longer in the presidency', () => {
    useWorkspaceStore.getState().setSupervisorFilter('p9');
    renderBar(board([ministry('a', 1, 'p1')]));
    expect(useWorkspaceStore.getState().supervisorFilter).toBeNull();
  });
});
