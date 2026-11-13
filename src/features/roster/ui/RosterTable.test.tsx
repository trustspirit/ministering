import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { household, member } from '@tests/testUtils';
import { groupRoster } from '../domain/groupRoster';
import { buildMinistryInfo } from '../domain/ministryInfo';
import { RosterTable } from './RosterTable';

const han = household({ id: 'h6', name: '한상철 가정', address: '서울 어딘가 1', memo: '첫 줄\n둘째 줄' });
const members = [
  member({ id: 'c1', full_name: '한지훈', birth_date: '2010-03-01', household_role: 'child', household_id: 'h6', active_status: 'new_member' }),
  member({ id: 'w', full_name: '임미경', gender: 'F', birth_date: '1978-02-01', household_role: 'wife', household_id: 'h6', phone: '010-1111-2222' }),
  member({ id: 'h', full_name: '한상철', birth_date: '1976-01-01', household_role: 'husband', household_id: 'h6' }),
  member({ id: 'x', full_name: '독거인', gender: 'F', birth_date: '1990-01-01' }),
];
const none = { search: '', gender: 'all', activeStatus: 'all', personality: 'all' } as const;
const info = buildMinistryInfo(
  { organization: 'EQ', ministries: [{ id: 'm', number: 2, name: null, companionIds: ['h'], recipientIds: ['h6'] }] },
  { organization: 'RS', ministries: [{ id: 'r', number: 1, name: null, companionIds: ['w'], recipientIds: ['x'] }] },
);

describe('RosterTable', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders a household row followed by its members in family order, then 가정 미지정', () => {
    render(<RosterTable groups={groupRoster(members, [han], none)} info={info} />);
    const rows = screen.getAllByRole('row').slice(1);
    const text = rows.map((r) => r.textContent ?? '');
    expect(text[0]).toContain('한상철 가정');
    expect(text[0]).toContain('서울 어딘가 1 · 3명');
    expect(text[0]).toContain('성역 동반자 2');
    expect(text[0]).toContain('첫 줄');
    expect(text[0]).not.toContain('둘째 줄');
    expect(text[1]).toContain('한상철');
    expect(text[2]).toContain('임미경');
    expect(text[3]).toContain('한지훈');
    expect(text[4]).toContain('가정 미지정');
    expect(text[5]).toContain('독거인');
  });

  it('shows organization, ministry and assigned ministry per person', () => {
    render(<RosterTable groups={groupRoster(members, [han], none)} info={info} />);
    const wife = screen.getByText('임미경').closest('tr')!;
    expect(within(wife).getByText('상호부조회')).toBeInTheDocument();
    expect(within(wife).getByText('성역 동반자 1')).toBeInTheDocument();
    expect(within(wife).getByRole('link', { name: '010-1111-2222' })).toBeInTheDocument();
    const child = screen.getByText('한지훈').closest('tr')!;
    expect(within(child).getByText('새로운 회원')).toBeInTheDocument();
    expect(within(child).queryByText('장로 정원회')).toBeNull();
    const lone = screen.getByText('독거인').closest('tr')!;
    expect(within(lone).getByText('성역 동반자 1')).toBeInTheDocument();
  });

  it('has no edit links without edit handlers', () => {
    render(<RosterTable groups={groupRoster(members, [han], none)} info={info} />);
    expect(screen.queryByRole('button', { name: /수정/ })).toBeNull();
  });

  it('calls the edit handlers', () => {
    const onEditMember = vi.fn();
    const onEditHousehold = vi.fn();
    render(
      <RosterTable
        groups={groupRoster(members, [han], none)}
        info={info}
        onEditMember={onEditMember}
        onEditHousehold={onEditHousehold}
      />,
    );
    screen.getByRole('button', { name: '한상철 가정 수정' }).click();
    screen.getByRole('button', { name: '임미경 수정' }).click();
    expect(onEditHousehold).toHaveBeenCalledWith(han);
    expect(onEditMember).toHaveBeenCalledWith(members[1]);
  });
});
