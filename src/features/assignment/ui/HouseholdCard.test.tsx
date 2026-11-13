import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HouseholdCard } from './HouseholdCard';
import { household, member, renderWorkspace } from '@tests/testUtils';

const han = household({ id: 'h6', name: '한상철 가정' });
// Deliberately out of family order: child first, wife before husband.
const family = [
  member({ id: 'c1', full_name: '한지훈', gender: 'M', birth_date: '2007-03-01', household_role: 'child', household_id: 'h6', active_status: 'new_member' }),
  member({ id: 'w', full_name: '임미경', gender: 'F', birth_date: '1978-02-01', household_role: 'wife', household_id: 'h6' }),
  member({ id: 'h', full_name: '한상철', gender: 'M', birth_date: '1976-01-01', household_role: 'husband', household_id: 'h6' }),
];

describe('HouseholdCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('lists the family as "name age·gender" in family order and marks new members', () => {
    render(renderWorkspace(<HouseholdCard household={han} members={family} />).wrapper);
    expect(screen.getByText('3명')).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: '가족' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('한상철 50·남');
    expect(items[1]).toHaveTextContent('임미경 48·여');
    expect(items[2]).toHaveTextContent('한지훈 19·남');
    expect(items[2]).toHaveTextContent('새로운 회원');
    expect(items[0]).not.toHaveTextContent('회원');
  });

  it('renders a household with no members as "0명" only', () => {
    render(renderWorkspace(<HouseholdCard household={han} members={[]} />).wrapper);
    expect(screen.getByText('한상철 가정')).toBeInTheDocument();
    expect(screen.getByText('0명')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('is draggable only when the board is editable', () => {
    render(renderWorkspace(<HouseholdCard household={han} members={family} />, { canEdit: false }).wrapper);
    expect(screen.getByText('한상철 가정').closest('[draggable]')).toBeNull();
  });
});
