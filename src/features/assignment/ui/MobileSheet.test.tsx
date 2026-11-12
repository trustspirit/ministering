import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Board } from '../domain/board';
import { useWorkspaceStore } from '../store';
import { MobileSheet } from './MobileSheet';
import { household, member, renderWorkspace } from './testUtils';

vi.mock('@/shared/hooks/useIsMobile', () => ({ useIsMobile: () => true }));
vi.mock('../hooks/useAssignmentBoard', () => ({ useAssignmentBoard: () => ({ data: undefined }) }));
vi.mock('@/shared/auth/usePermission', () => ({ usePermission: () => ({ canEditMembers: true }) }));
vi.mock('@/features/members/hooks/useMemberMutations', () => ({ useUpdateMember: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/features/households/hooks/useHouseholdMutations', () => ({ useUpdateHousehold: () => ({ mutateAsync: vi.fn() }) }));

const kim = member({ id: 'm1', full_name: '김도현', birth_date: '1986-01-25', household_id: 'h1' });
const lee = member({ id: 'm2', full_name: '이준호', birth_date: '1988-03-02', household_id: 'h2' });
const park = member({ id: 'm3', full_name: '박민수', birth_date: '1990-05-05', household_id: 'h3' });
const h1 = household({ id: 'h1', name: '김도현 가정' });
const h2 = household({ id: 'h2', name: '이준호 가정' });
const h3 = household({ id: 'h3', name: '박민수 가정' });

const board: Board = {
  organization: 'EQ',
  ministries: [
    { id: 'g1', number: 1, name: null, companionIds: ['m1', 'm2'], recipientIds: ['h2'] },
  ],
};

function open(sel: { kind: 'member' | 'household'; id: string }, canEdit = true) {
  useWorkspaceStore.setState({ selected: sel });
  const { wrapper, value } = renderWorkspace(<MobileSheet />, {
    canEdit,
    board,
    members: [kim, lee, park],
    households: [h1, h2, h3],
  });
  render(wrapper);
  return value;
}

describe('MobileSheet', () => {
  beforeEach(() => {
    // jsdom has no layout; the Select scrolls its highlighted option into view.
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    cleanup();
    act(() => useWorkspaceStore.setState({ selected: null }));
  });

  it('shows the assign row above the detail for a selected household', () => {
    open({ kind: 'household', id: 'h3' });
    expect(screen.getByText('임무 지명…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '박민수 가정' })).toBeInTheDocument();
    // not assigned yet: nothing to release
    expect(screen.queryByRole('button', { name: '해제' })).toBeNull();
  });

  it('performs the ops from resolveDrop when an option is chosen', async () => {
    const user = userEvent.setup();
    const value = open({ kind: 'household', id: 'h3' });
    await user.click(screen.getByText('임무 지명…'));
    await user.click(await screen.findByText('성역 동반자 1에 지명'));
    expect(value.actions.perform).toHaveBeenCalledWith([
      { type: 'add', role: 'recipient', ministryId: 'g1', targetId: 'h3' },
    ]);
  });

  it('shows the rejection as a toast and does not perform', async () => {
    const user = userEvent.setup();
    const value = open({ kind: 'household', id: 'h1' });
    // h1 is the household of companion m1 of g1
    await user.click(screen.getByText('임무 지명…'));
    await user.click(await screen.findByText('성역 동반자 1에 지명'));
    expect(await screen.findByText('성역자 자신의 가정에는 지명할 수 없습니다')).toBeInTheDocument();
    expect(value.actions.perform).not.toHaveBeenCalled();
  });

  it('releases an assigned household back to the pool', async () => {
    const user = userEvent.setup();
    const value = open({ kind: 'household', id: 'h2' });
    await user.click(screen.getByRole('button', { name: '해제' }));
    expect(value.actions.perform).toHaveBeenCalledWith([
      { type: 'remove', role: 'recipient', ministryId: 'g1', targetId: 'h2' },
    ]);
  });

  it('closing clears the selection', async () => {
    const user = userEvent.setup();
    open({ kind: 'household', id: 'h3' });
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(useWorkspaceStore.getState().selected).toBeNull();
  });

  it('has no select or release for a viewer, only close', () => {
    open({ kind: 'household', id: 'h2' }, false);
    expect(screen.queryByText('임무 지명…')).toBeNull();
    expect(screen.queryByRole('button', { name: '해제' })).toBeNull();
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
  });
});
