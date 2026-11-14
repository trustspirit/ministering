import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { BoardMinistry } from '../domain/board';
import { useWorkspaceStore } from '../store';
import { MinistryCard } from './MinistryCard';
import { household, member, renderWorkspace } from '@tests/testUtils';

const m1 = member({ id: 'm1', full_name: '김도현', birth_date: '1990-01-25', household_id: 'h1' });
const h1 = household({ id: 'h1', name: '김도현 가정' });
const p1 = member({ id: 'p1', full_name: '임재홍', birth_date: '1980-04-12' });
const p2 = member({ id: 'p2', full_name: '김유명', birth_date: '1975-01-01' });

function ministry(over: Partial<BoardMinistry> = {}): BoardMinistry {
  return { id: 'g1', number: 1, name: null, supervisorId: null, companionIds: ['m1'], recipientIds: [], ...over };
}

function renderCard(
  opts: { canEdit?: boolean; ministry?: BoardMinistry; org?: 'EQ' | 'RS'; presidencyIds?: string[] } = {},
) {
  const org = opts.org ?? 'EQ';
  const canEdit = opts.canEdit ?? true;
  const { wrapper, value } = renderWorkspace(
    <MinistryCard ministry={opts.ministry ?? ministry()} org={org} canEdit={canEdit} />,
    {
      org,
      canEdit,
      members: [m1, p1, p2],
      households: [h1],
      board: { organization: org, presidencyIds: opts.presidencyIds ?? ['p1', 'p2'], pool: { companionIds: [], recipientIds: [] }, ministries: [] },
    },
  );
  render(wrapper);
  return value;
}

const rpc = vi.hoisted(() => ({ getShareToken: vi.fn(async () => null) }));
vi.mock('@/repositories/MinistryRepository', () => ({ ministryRepository: { getShareToken: rpc.getShareToken } }));

describe('MinistryCard', () => {
  it('shows red and yellow warnings and no "2–4명" hint', () => {
    renderCard();
    expect(screen.getByText('성역자가 2명 이상 필요합니다')).toBeInTheDocument();
    expect(screen.getByText('지명된 가정이 없습니다')).toBeInTheDocument();
    expect(screen.queryByText(/2–4명/)).toBeNull();
  });

  it('uses the RS wording on the RS board', () => {
    renderCard({ org: 'RS', ministry: ministry({ companionIds: [], recipientIds: [] }) });
    expect(screen.getByText('지명된 자매가 없습니다')).toBeInTheDocument();
    expect(screen.getByText('자매 성역자')).toBeInTheDocument();
  });

  it('titles the card with its number or its name', () => {
    renderCard({ ministry: ministry({ name: '시내 동반자' }) });
    expect(screen.getByRole('heading', { name: /시내 동반자/ })).toBeInTheDocument();
  });

  it('removes a companion with the × button', () => {
    const value = renderCard();
    fireEvent.click(screen.getByRole('button', { name: '지명 해제' }));
    expect(value.actions.perform).toHaveBeenCalledWith([
      { type: 'remove', role: 'companion', ministryId: 'g1', targetId: 'm1' },
    ]);
  });

  it('hides edit controls and dragging when canEdit is false', () => {
    renderCard({ canEdit: false });
    expect(screen.queryByRole('button', { name: '지명 해제' })).toBeNull();
    expect(screen.queryByRole('button', { name: '이름 바꾸기 · 삭제' })).toBeNull();
    expect(screen.queryByText('공유')).toBeNull();
    expect(screen.queryByRole('button', { name: '링크 만들기' })).toBeNull();
    expect(rpc.getShareToken).not.toHaveBeenCalled();
    expect(screen.getByText('김도현').closest('[draggable]')).toBeNull();
  });

  it('opens the share dialog from 공유 for an editor', () => {
    renderCard();
    fireEvent.click(screen.getByText('공유'));
    expect(screen.getByRole('button', { name: '링크 만들기' })).toBeInTheDocument();
  });

  it('keeps × in the accessibility tree for an editor (hidden only visually)', () => {
    renderCard();
    const x = screen.getByRole('button', { name: '지명 해제' });
    x.focus();
    expect(x).toHaveFocus();
  });

  it('selects a card with Enter and toggles the highlight from the title with Enter/Space', () => {
    useWorkspaceStore.setState({ selected: null, hotMinistryId: null });
    renderCard();
    const card = screen.getByRole('button', { name: /^김도현 / });
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(useWorkspaceStore.getState().selected).toEqual({ kind: 'member', id: 'm1' });

    const title = screen.getByRole('button', { name: '성역 동반자 1' });
    fireEvent.keyDown(title, { key: 'Enter' });
    expect(useWorkspaceStore.getState().hotMinistryId).toBe('g1');
    fireEvent.keyDown(title, { key: ' ' });
    expect(useWorkspaceStore.getState().hotMinistryId).toBeNull();
  });

  it('Enter on × is left to the button and does not select the card', () => {
    useWorkspaceStore.setState({ selected: null });
    renderCard();
    const x = screen.getByRole('button', { name: '지명 해제' });
    fireEvent.keyDown(x, { key: 'Enter' });
    expect(useWorkspaceStore.getState().selected).toBeNull();
  });

  it('renders an unsaved (tmp-) ministry as pending: no menu, no ×, no drag, no drop', () => {
    const value = renderCard({ ministry: ministry({ id: 'tmp-1-0' }) });
    const card = screen.getByRole('region', { name: '성역 동반자 1' });
    expect(card).toHaveAttribute('aria-busy', 'true');
    expect(card).toHaveClass('aw-mcard--pending');
    expect(screen.queryByRole('button', { name: '이름 바꾸기 · 삭제' })).toBeNull();
    expect(screen.queryByRole('button', { name: '지명 해제' })).toBeNull();
    expect(screen.getByText('김도현').closest('[draggable]')).toBeNull();
    fireEvent.drop(card, { dataTransfer: { types: ['application/x-ministering-item'] } });
    expect(value.actions.perform).not.toHaveBeenCalled();
  });

  it('toggles the highlighted ministry when the card is clicked', () => {
    useWorkspaceStore.setState({ hotMinistryId: null });
    renderCard();
    const card = screen.getByRole('region', { name: '성역 동반자 1' });
    fireEvent.click(card);
    expect(useWorkspaceStore.getState().hotMinistryId).toBe('g1');
    fireEvent.click(card);
    expect(useWorkspaceStore.getState().hotMinistryId).toBeNull();
  });

  it('shows 담당 이름 on the card', () => {
    renderCard({ canEdit: false, ministry: ministry({ supervisorId: 'p1' }) });
    expect(screen.getByText('담당 임재홍')).toBeInTheDocument();
  });

  it('shows 담당 없음 when unset', () => {
    renderCard({ canEdit: false });
    expect(screen.getByText('담당 없음')).toBeInTheDocument();
  });

  it('viewers see the supervisor as plain text', () => {
    renderCard({ canEdit: false, ministry: ministry({ supervisorId: 'p1' }) });
    expect(screen.queryByRole('button', { name: /담당 회장단 선택/ })).toBeNull();
  });

  it('editors pick a supervisor from the presidency only', async () => {
    const value = renderCard({ presidencyIds: ['p1', 'p2'] });
    fireEvent.click(screen.getByRole('button', { name: /담당 회장단 선택/ }));
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['김유명', '임재홍', '담당 없음']);
    fireEvent.click(screen.getByRole('menuitem', { name: '임재홍' }));
    expect(value.actions.setSupervisor).toHaveBeenCalledWith('g1', 'p1');
  });

  it('choosing 담당 없음 clears the supervisor', async () => {
    const value = renderCard({ ministry: ministry({ supervisorId: 'p1' }) });
    fireEvent.click(screen.getByRole('button', { name: /담당 회장단 선택/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '담당 없음' }));
    expect(value.actions.setSupervisor).toHaveBeenCalledWith('g1', null);
  });
});
