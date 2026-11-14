import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Board, BoardMinistry } from '../domain/board';
import { useWorkspaceStore } from '../store';
import { BoardPanel } from './BoardPanel';
import { renderWorkspace } from '@tests/testUtils';

function ministry(id: string, number: number, supervisorId: string | null): BoardMinistry {
  return { id, number, name: null, supervisorId, companionIds: [], recipientIds: [] };
}

const board: Board = {
  organization: 'EQ',
  presidencyIds: ['s1', 's2'],
  ministries: [ministry('a', 1, 's1'), ministry('b', 2, 's2'), ministry('c', 3, null)],
};

afterEach(() => useWorkspaceStore.getState().setSupervisorFilter(null));

describe('BoardPanel supervisor filter', () => {
  it('shows every ministry without a filter', () => {
    const { wrapper } = renderWorkspace(<BoardPanel />, { board, canEdit: false });
    render(wrapper);
    expect(screen.getAllByRole('region').filter((r) => r.classList.contains('aw-mcard'))).toHaveLength(3);
  });

  it("renders only the filtered supervisor's ministries", () => {
    useWorkspaceStore.getState().setSupervisorFilter('s1');
    const { wrapper } = renderWorkspace(<BoardPanel />, { board, canEdit: false });
    render(wrapper);
    const cards = screen.getAllByRole('region').filter((r) => r.classList.contains('aw-mcard'));
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAccessibleName('성역 동반자 1');
  });
});
