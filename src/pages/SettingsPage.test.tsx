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

const USERS = [
  { user_id: 'u1', email: 'bishop@test.local', role: 'bishopric', display_name: '감독님', created_at: '' },
  { user_id: 'u2', email: 'viewer@test.local', role: 'viewer', display_name: '열람자', created_at: '' },
];

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
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByText('viewer@test.local')).toBeInTheDocument();
    expect(screen.getByText('사용자').parentElement).toHaveTextContent('사용자 2');
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
});
