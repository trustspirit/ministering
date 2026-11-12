import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { household, member } from '@/features/assignment/ui/testUtils';
import { groupRoster } from '../domain/groupRoster';
import { buildMinistryInfo } from '../domain/ministryInfo';
import { RosterList } from './RosterList';

const han = household({ id: 'h6', name: '한상철 가정', address: '서울 어딘가 1', memo: '첫 줄\n둘째 줄' });
const members = [
  member({ id: 'c1', full_name: '한지훈', birth_date: '2010-03-01', household_role: 'child', household_id: 'h6', active_status: 'new_member' }),
  member({ id: 'w', full_name: '임미경', gender: 'F', birth_date: '1978-02-01', household_role: 'wife', household_id: 'h6', phone: '010-1111-2222', memo: '메모 하나\n메모 둘' }),
  member({ id: 'h', full_name: '한상철', birth_date: '1976-01-01', household_role: 'husband', household_id: 'h6' }),
  member({ id: 'x', full_name: '독거인', gender: 'F', birth_date: '1990-01-01' }),
];
const none = { search: '', gender: 'all', activeStatus: 'all', personality: 'all' } as const;
const info = buildMinistryInfo(
  { organization: 'EQ', ministries: [{ id: 'm', number: 2, name: null, companionIds: ['h'], recipientIds: ['h6'] }] },
  { organization: 'RS', ministries: [{ id: 'r', number: 1, name: null, companionIds: ['w'], recipientIds: ['x'] }] },
);
const groups = groupRoster(members, [han], none);

describe('RosterList (phone roster)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('stacks each household with its members in family order, then 가정 미지정, without a table', () => {
    const { container } = render(<RosterList groups={groups} info={info} />);
    expect(container.querySelector('table')).toBeNull();
    const headings = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(headings).toEqual(['한상철 가정', '가정 미지정']);
    const [family, loose] = screen.getAllByRole('list');
    expect(within(family).getAllByRole('listitem').map((li) => li.querySelector('b')?.textContent)).toEqual([
      '한상철',
      '임미경',
      '한지훈',
    ]);
    expect(within(loose).getByText('독거인')).toBeInTheDocument();
  });

  it('shows the household line: address, headcount, assigned ministry and the first memo line', () => {
    render(<RosterList groups={groups} info={info} />);
    const hh = screen.getByRole('heading', { name: '한상철 가정' }).closest('section')!;
    const head = hh.querySelector('header')!;
    expect(head.textContent).toContain('서울 어딘가 1 · 3명');
    expect(head.textContent).toContain('성역 동반자 2');
    expect(head.textContent).toContain('첫 줄');
    expect(head.textContent).not.toContain('둘째 줄');
  });

  it('shows each person: age, gender, status, organization, ministry, phone and first memo line', () => {
    render(<RosterList groups={groups} info={info} />);
    const wife = screen.getByText('임미경').closest('li')!;
    expect(wife.textContent).toContain('48');
    expect(wife.textContent).toContain('여');
    expect(within(wife).getByText('상호부조회')).toBeInTheDocument();
    expect(within(wife).getByText('성역 동반자 1')).toBeInTheDocument();
    expect(within(wife).getByRole('link', { name: '010-1111-2222' })).toBeInTheDocument();
    expect(wife.textContent).toContain('메모 하나');
    expect(wife.textContent).not.toContain('메모 둘');
    const child = screen.getByText('한지훈').closest('li')!;
    expect(within(child).getByText('새로운 회원')).toBeInTheDocument();
    const lone = screen.getByText('독거인').closest('li')!;
    expect(lone.textContent).toContain('지명된 성역자');
    expect(lone.textContent).toContain('성역 동반자 1');
  });

  it('has no edit controls without edit handlers (viewers)', () => {
    render(<RosterList groups={groups} info={info} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls the edit handlers', () => {
    const onEditMember = vi.fn();
    const onEditHousehold = vi.fn();
    render(<RosterList groups={groups} info={info} onEditMember={onEditMember} onEditHousehold={onEditHousehold} />);
    screen.getByRole('button', { name: '한상철 가정 수정' }).click();
    screen.getByRole('button', { name: '임미경 수정' }).click();
    expect(onEditHousehold).toHaveBeenCalledWith(han);
    expect(onEditMember).toHaveBeenCalledWith(members[1]);
  });
});
