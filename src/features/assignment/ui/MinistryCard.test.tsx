import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { BoardMinistry } from '../domain/board';
import { useWorkspaceStore } from '../store';
import { MinistryCard } from './MinistryCard';
import { household, member, renderWorkspace } from './testUtils';

const m1 = member({ id: 'm1', full_name: '김도현', birth_date: '1990-01-25', household_id: 'h1' });
const h1 = household({ id: 'h1', name: '김도현 가정' });

function ministry(over: Partial<BoardMinistry> = {}): BoardMinistry {
  return { id: 'g1', number: 1, name: null, shareToken: null, companionIds: ['m1'], recipientIds: [], ...over };
}

function renderCard(opts: { canEdit?: boolean; ministry?: BoardMinistry; org?: 'EQ' | 'RS' } = {}) {
  const org = opts.org ?? 'EQ';
  const canEdit = opts.canEdit ?? true;
  const { wrapper, value } = renderWorkspace(
    <MinistryCard ministry={opts.ministry ?? ministry()} org={org} canEdit={canEdit} />,
    { org, canEdit, members: [m1], households: [h1] },
  );
  render(wrapper);
  return value;
}

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
    expect(screen.getByText('김도현').closest('[draggable]')).toBeNull();
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
});
