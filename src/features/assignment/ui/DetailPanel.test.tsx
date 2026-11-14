import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Board } from '../domain/board';
import { useWorkspaceStore } from '../store';
import { DetailPanel } from './DetailPanel';
import { MemoEditor } from './MemoEditor';
import { household, member, renderWorkspace } from '@tests/testUtils';

const mocks = vi.hoisted(() => ({
  boards: {} as Record<string, unknown>,
  canEditMembers: true,
  updateMember: vi.fn<(arg: unknown) => Promise<object>>(async () => ({})),
  updateHousehold: vi.fn<(arg: unknown) => Promise<object>>(async () => ({})),
}));

vi.mock('../hooks/useAssignmentBoard', () => ({
  useAssignmentBoard: (org: string) => ({ data: mocks.boards[org] }),
}));
vi.mock('@/features/members/hooks/useMemberMutations', () => ({
  useUpdateMember: () => ({ mutateAsync: mocks.updateMember }),
}));
vi.mock('@/features/households/hooks/useHouseholdMutations', () => ({
  useUpdateHousehold: () => ({ mutateAsync: mocks.updateHousehold }),
}));
vi.mock('@/shared/auth/usePermission', () => ({
  usePermission: () => ({ canEditMembers: mocks.canEditMembers }),
}));

const han = household({ id: 'h6', name: '한상철 가정', address: '서울 어딘가 1', memo: '가정 메모 원문' });
const family = [
  member({ id: 'c1', full_name: '한지훈', gender: 'M', birth_date: '2007-03-01', household_role: 'child', household_id: 'h6', active_status: 'new_member' }),
  member({ id: 'w', full_name: '임미경', gender: 'F', birth_date: '1978-02-01', household_role: 'wife', household_id: 'h6', phone: '010-1111-2222', memo: '미경 메모' }),
  member({ id: 'h', full_name: '한상철', gender: 'M', birth_date: '1976-01-01', household_role: 'husband', household_id: 'h6', memo: '상철 메모' }),
];
const lone = member({ id: 'x', full_name: '독거인', gender: 'F', birth_date: '1990-01-01' });

const eqBoard: Board = {
  organization: 'EQ',
  presidencyIds: [],
  ministries: [{ id: 'm1', number: 1, name: null, supervisorId: null, companionIds: ['x'], recipientIds: ['h6'] }],
};
const rsBoard: Board = {
  organization: 'RS',
  presidencyIds: [],
  ministries: [{ id: 'm2', number: 2, name: null, supervisorId: null, companionIds: ['w'], recipientIds: ['x'] }],
};

function open(sel: { kind: 'member' | 'household'; id: string } | null, opts: Parameters<typeof renderWorkspace>[1] = {}) {
  useWorkspaceStore.setState({ selected: sel });
  const { wrapper } = renderWorkspace(<DetailPanel />, {
    members: [...family, lone],
    households: [han],
    ...opts,
  });
  return render(wrapper);
}

describe('DetailPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00'));
    mocks.boards = { EQ: eqBoard, RS: rsBoard };
    mocks.canEditMembers = true;
    mocks.updateMember.mockClear();
    mocks.updateHousehold.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    useWorkspaceStore.setState({ selected: null });
  });

  it('shows a guide when nothing is selected', () => {
    open(null);
    expect(screen.getByText(/배경 정보가 열립니다/)).toBeInTheDocument();
  });

  it('shows a household with its family in family order and a household memo section', () => {
    open({ kind: 'household', id: 'h6' });
    expect(screen.getByRole('heading', { name: '한상철 가정' })).toBeInTheDocument();
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1); // skip the header row
    expect(rows[0]).toHaveTextContent('한상철');
    expect(rows[1]).toHaveTextContent('임미경');
    expect(rows[2]).toHaveTextContent('한지훈');
    expect(screen.getByText('가정 메모')).toBeInTheDocument();
    expect(screen.getByText('가정 메모 원문')).toBeInTheDocument();
    expect(screen.getByText('상철 메모')).toBeInTheDocument();
    expect(screen.getByText(/지명된 형제 성역자: 독거인/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '010-1111-2222' })).toHaveAttribute('href', 'tel:010-1111-2222');
  });

  it('lists every assignment of a person across both organizations', () => {
    open({ kind: 'member', id: 'w' });
    expect(screen.getByText('상호부조회 성역 동반자 2에서 봉사')).toBeInTheDocument();
    expect(screen.getByText('가정에 지명된 형제 성역자: 독거인 (성역 동반자 1)')).toBeInTheDocument();
    expect(screen.getByText('개인 메모')).toBeInTheDocument();
    expect(screen.getByText('가정 메모')).toBeInTheDocument();
  });

  it('shows "임무 지명 없음" and 가정 미지정 for an unassigned person without a household', () => {
    mocks.boards = { EQ: { organization: 'EQ', presidencyIds: [], ministries: [] }, RS: { organization: 'RS', presidencyIds: [], ministries: [] } };
    open({ kind: 'member', id: 'x' });
    expect(screen.getByText('임무 지명 없음')).toBeInTheDocument();
    expect(screen.getByText('가정 미지정')).toBeInTheDocument();
    expect(screen.queryByText('가정 메모')).toBeNull();
  });

  it('shows 지명 for a person assigned as an RS recipient', () => {
    open({ kind: 'member', id: 'x' });
    expect(screen.getByText('지명된 자매 성역자: 임미경 (성역 동반자 2)')).toBeInTheDocument();
    expect(screen.getByText('장로 정원회 성역 동반자 1에서 봉사')).toBeInTheDocument();
  });

  it('hides "메모 편집" without member edit permission', () => {
    mocks.canEditMembers = false;
    open({ kind: 'household', id: 'h6' });
    expect(screen.queryByText('메모 편집')).toBeNull();
  });

  it('saves a household memo without touching other fields, storing null when emptied', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open({ kind: 'household', id: 'h6' });
    const section = screen.getByText('가정 메모').closest('.aw-nb') as HTMLElement;
    await user.click(within(section).getByText('메모 편집'));
    const ta = within(section).getByRole('textbox');
    expect(ta).toHaveValue('가정 메모 원문');
    await user.clear(ta);
    await user.click(within(section).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.updateHousehold).toHaveBeenCalledTimes(1));
    expect(mocks.updateHousehold).toHaveBeenCalledWith({ id: 'h6', patch: { memo: null }, previousAddress: '서울 어딘가 1' });
  });

  it('saves a personal memo through the member mutation', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open({ kind: 'member', id: 'w' });
    const section = screen.getByText('개인 메모').closest('.aw-nb') as HTMLElement;
    await user.click(within(section).getByText('메모 편집'));
    const ta = within(section).getByRole('textbox');
    await user.clear(ta);
    await user.type(ta, '새 메모  ');
    await user.click(within(section).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.updateMember).toHaveBeenCalledTimes(1));
    expect(mocks.updateMember).toHaveBeenCalledWith({ id: 'w', patch: { memo: '새 메모' }, previousAddress: null });
  });

  it('clears the selection when the selected record no longer exists', async () => {
    open({ kind: 'member', id: 'gone' });
    await waitFor(() => expect(useWorkspaceStore.getState().selected).toBeNull());
  });
});

describe('MemoEditor', () => {
  it('shows the note and an edit link only when editable', () => {
    const { wrapper } = renderWorkspace(<MemoEditor value="본문" onSave={vi.fn()} canEdit={false} label="가정 메모" />);
    render(wrapper);
    expect(screen.getByText('본문')).toBeInTheDocument();
    expect(screen.queryByText('메모 편집')).toBeNull();
  });

  it('shows muted placeholder text for an empty memo', () => {
    const { wrapper } = renderWorkspace(<MemoEditor value={null} onSave={vi.fn()} canEdit label="가정 메모" />);
    render(wrapper);
    expect(screen.getByText('아직 메모가 없습니다')).toBeInTheDocument();
  });

  it('calls onSave once with the typed text, and cancel keeps the original', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    const { wrapper } = renderWorkspace(<MemoEditor value="원문" onSave={onSave} canEdit label="가정 메모" />);
    render(wrapper);
    await user.click(screen.getByText('메모 편집'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '바뀐 글');
    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.getByText('원문')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByText('메모 편집'));
    expect(screen.getByRole('textbox')).toHaveValue('원문');
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '바뀐 글');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('바뀐 글');
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  });

  it('stays open with the typed text and shows a toast when saving fails', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {
      throw new Error('nope');
    });
    const { wrapper } = renderWorkspace(<MemoEditor value="원문" onSave={onSave} canEdit label="가정 메모" />);
    render(wrapper);
    await user.click(screen.getByText('메모 편집'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '쓴 글');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('메모를 저장하지 못했습니다. 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('쓴 글');
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('disables the buttons while saving', async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((r) => (release = r)));
    const { wrapper } = renderWorkspace(<MemoEditor value="원문" onSave={onSave} canEdit label="가정 메모" />);
    render(wrapper);
    await user.click(screen.getByText('메모 편집'));
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  });
});
