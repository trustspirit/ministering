import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from 'trust-ui-react';
import SettingsPage from './SettingsPage';

const mocks = vi.hoisted(() => ({
  role: 'bishopric' as string,
  profileLoaded: true,
  users: [] as unknown[],
  mutateRole: vi.fn(),
  mutateName: vi.fn(),
  createUser: vi.fn(),
  createResetLink: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: mocks.profileLoaded ? { role: mocks.role } : null,
    profileLoaded: mocks.profileLoaded,
  }),
}));
vi.mock('@/features/settings/hooks/useAppUsers', () => ({
  useAppUsers: () => ({ data: mocks.users, isError: false }),
}));
vi.mock('@/features/settings/hooks/useProfileMutations', () => ({
  useUpdateProfileRole: () => ({ mutateAsync: mocks.mutateRole, isPending: false }),
  useUpdateDisplayName: () => ({ mutateAsync: mocks.mutateName, isPending: false }),
}));
vi.mock('@/features/settings/hooks/useAdminUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/settings/hooks/useAdminUsers')>()),
  useAdminUsers: () => ({
    createUser: { mutateAsync: mocks.createUser, isPending: false },
    createResetLink: { mutateAsync: mocks.createResetLink, isPending: false },
    deleteUser: { mutateAsync: mocks.deleteUser, isPending: false },
  }),
}));

const USERS = [
  { user_id: 'u1', email: 'bishop@test.local', role: 'bishopric', display_name: '감독님', created_at: '', has_password: true },
  { user_id: 'u2', email: 'viewer@test.local', role: 'viewer', display_name: '열람자', created_at: '', has_password: true },
  { user_id: 'u3', email: 'new@test.local', role: 'eq_president', display_name: '새 회장', created_at: '', has_password: false },
];
const HASH = 'cd'.repeat(28);
const ONCE_NOTE = '24시간 동안 한 번만 쓸 수 있습니다. 새 링크를 만들면 이전 링크는 쓸 수 없습니다.';

function renderSettings() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<div>home page</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mocks.role = 'bishopric';
    mocks.profileLoaded = true;
    mocks.users = USERS;
    mocks.mutateRole.mockReset().mockResolvedValue(undefined);
    mocks.mutateName.mockReset().mockResolvedValue(undefined);
    mocks.createUser.mockReset().mockResolvedValue({ userId: 'u9', tokenHash: HASH, type: 'invite' });
    mocks.createResetLink.mockReset().mockResolvedValue({ userId: 'u2', tokenHash: HASH, type: 'recovery' });
    mocks.deleteUser.mockReset().mockResolvedValue(undefined);
  });

  it('sends anyone but the bishopric home', () => {
    mocks.role = 'rs_president';
    renderSettings();
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('waits for the profile instead of redirecting a bishopric home after a reload', () => {
    mocks.profileLoaded = false;
    renderSettings();
    expect(screen.queryByText('home page')).toBeNull();
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument();
  });

  it('counts and lists the users with their roles', () => {
    renderSettings();
    const table = screen.getByRole('table', { name: '사용자 목록' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('viewer@test.local')).toBeInTheDocument();
    expect(screen.getByText('사용자').parentElement).toHaveTextContent('사용자 3');
  });

  it('asks before changing a role and saves only after confirming', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('combobox', { name: '열람자 역할' }));
    await user.click(await screen.findByRole('option', { name: '상호부조회 회장단' }));
    expect(mocks.mutateRole).not.toHaveBeenCalled();
    expect(await screen.findByText('열람자의 역할을 "상호부조회 회장단"(으)로 바꿀까요?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '변경' }));
    expect(mocks.mutateRole).toHaveBeenCalledWith({ userId: 'u2', role: 'rs_president' });
  });

  it('edits a display name in place', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('button', { name: '열람자 이름 수정' }));
    const field = screen.getByLabelText('viewer@test.local 표시 이름');
    await user.clear(field);
    await user.type(field, '새 이름');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(mocks.mutateName).toHaveBeenCalledWith({ userId: 'u2', displayName: '새 이름' });
  });

  it('marks people who have not set a password yet', () => {
    renderSettings();
    const rows = within(screen.getByRole('table', { name: '사용자 목록' })).getAllByRole('row');
    expect(rows[3]).toHaveTextContent('비밀번호 미설정');
    expect(rows[2]).not.toHaveTextContent('비밀번호 미설정');
  });

  it('adds a user with normalised input and shows the setup link once', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('button', { name: '＋ 사용자 추가' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByLabelText(/비밀번호/)).toBeNull();
    await user.type(within(dialog).getByLabelText(/이름/), '  새 사람 ');
    await user.type(within(dialog).getByLabelText(/이메일/), ' New.Person@Test.Local ');
    await user.click(within(dialog).getByRole('combobox', { name: /역할/ }));
    await user.click(await screen.findByRole('option', { name: '장로 정원회 회장단' }));
    await user.click(within(dialog).getByRole('button', { name: '추가' }));

    expect(mocks.createUser).toHaveBeenCalledWith({
      email: 'new.person@test.local',
      displayName: '새 사람',
      role: 'eq_president',
    });
    const field = await within(dialog).findByLabelText('비밀번호 설정 링크');
    expect(field).toHaveValue(`${window.location.origin}/set-password?token_hash=${HASH}&type=invite`);
    expect(field).toHaveFocus();
    expect(within(dialog).getByText(ONCE_NOTE)).toBeInTheDocument();
    expect(within(dialog).getByText(/지금 한 번만 표시됩니다/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '링크 복사' })).toBeInTheDocument();
  });

  it('does not send an invalid email or an empty name', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('button', { name: '＋ 사용자 추가' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/이메일/), 'not-an-email');
    await user.click(within(dialog).getByRole('button', { name: '추가' }));
    expect(await within(dialog).findByText('이름을 입력해 주세요')).toBeInTheDocument();
    expect(within(dialog).getByText('이메일 형식이 맞지 않습니다')).toBeInTheDocument();
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('explains a refused add without closing the form', async () => {
    const { AdminUsersError } = await import('@/features/settings/hooks/useAdminUsers');
    mocks.createUser.mockRejectedValue(new AdminUsersError('email_exists'));
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('button', { name: '＋ 사용자 추가' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/이름/), '중복');
    await user.type(within(dialog).getByLabelText(/이메일/), 'viewer@test.local');
    await user.click(within(dialog).getByRole('button', { name: '추가' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('이미 등록된 이메일입니다');
    expect(within(dialog).getByLabelText(/이메일/)).toHaveValue('viewer@test.local');
  });

  it('makes a password-change link only after confirming', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole('button', { name: '열람자 비밀번호 변경 링크' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/열람자/)).toBeInTheDocument();
    expect(mocks.createResetLink).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: '링크 만들기' }));
    expect(mocks.createResetLink).toHaveBeenCalledWith({ userId: 'u2' });
    const field = await within(dialog).findByLabelText('비밀번호 설정 링크');
    expect(field).toHaveValue(`${window.location.origin}/set-password?token_hash=${HASH}&type=recovery`);
    expect(within(dialog).getByText(ONCE_NOTE)).toBeInTheDocument();
  });

  it('offers no delete on your own row and deletes others after naming them', async () => {
    const user = userEvent.setup();
    renderSettings();
    expect(screen.queryByRole('button', { name: '감독님 삭제' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '열람자 삭제' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/열람자\(viewer@test\.local\)/)).toBeInTheDocument();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));
    expect(mocks.deleteUser).toHaveBeenCalledWith({ userId: 'u2' });
  });

  it('never renders a password field for another user', () => {
    renderSettings();
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });
});
