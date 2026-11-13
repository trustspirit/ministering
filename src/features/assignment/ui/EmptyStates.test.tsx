import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useWorkspaceStore } from '../store';
import { BoardPanel } from './BoardPanel';
import { PoolPanel } from './PoolPanel';
import { household, member, renderWorkspace } from '@tests/testUtils';

afterEach(() => {
  cleanup();
  act(() => useWorkspaceStore.setState({ search: '' }));
});

describe('empty states', () => {
  it('pool lists with nothing left to assign say so, per organization', () => {
    const { wrapper } = renderWorkspace(<PoolPanel households={[]} />, { org: 'EQ' });
    render(wrapper);
    expect(screen.getByText('모든 형제가 성역 동반자에 속해 있습니다')).toBeInTheDocument();
    expect(screen.getByText('모든 가정에 성역자가 지명되었습니다')).toBeInTheDocument();
  });

  it('a search without hits shows the search message instead', () => {
    const kim = member({ id: 'm1', full_name: '김도현', household_id: 'h1' });
    const h1 = household({ id: 'h1', name: '김도현 가정' });
    act(() => useWorkspaceStore.setState({ search: '없는이름' }));
    const { wrapper } = renderWorkspace(<PoolPanel households={[h1]} />, { members: [kim], households: [h1] });
    render(wrapper);
    expect(screen.getAllByText('검색 결과가 없습니다')).toHaveLength(2);
    expect(screen.queryByText('김도현 가정')).toBeNull();
  });

  it('a board without companionships explains how to start (editors only get the hint)', () => {
    const { wrapper } = renderWorkspace(<BoardPanel />, { canEdit: true });
    render(wrapper);
    expect(screen.getByRole('heading', { name: '성역 동반자가 아직 없습니다' })).toBeInTheDocument();
    expect(screen.getByText(/새 성역 동반자로 지명하세요/)).toBeInTheDocument();
    cleanup();
    const viewer = renderWorkspace(<BoardPanel />, { canEdit: false });
    render(viewer.wrapper);
    expect(screen.getByRole('heading', { name: '성역 동반자가 아직 없습니다' })).toBeInTheDocument();
    expect(screen.queryByText(/새 성역 동반자로 지명하세요/)).toBeNull();
  });
});
