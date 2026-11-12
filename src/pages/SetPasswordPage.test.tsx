import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SetPasswordPage from './SetPasswordPage';

const auth = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock('@/shared/lib/supabase', () => ({ supabase: { auth } }));
const session = vi.hoisted(() => ({ user: null as { email: string } | null }));
vi.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: session.user }) }));

const HASH = 'ab'.repeat(28);
const LINK = `/set-password?token_hash=${HASH}&type=invite`;
const EXPIRED = '링크가 만료되었거나 이미 사용되었습니다. 관리자에게 새 링크를 요청해 주세요.';

function renderPage(entry = LINK) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fill(password: string, confirm = password) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('새 비밀번호'), password);
  await user.type(screen.getByLabelText('새 비밀번호 확인'), confirm);
  await user.click(screen.getByRole('button', { name: '비밀번호 설정' }));
  return user;
}

const verified = {
  data: { session: { user: { email: 'new@test.local' } }, user: { email: 'new@test.local' } },
  error: null,
};

describe('SetPasswordPage', () => {
  beforeEach(() => {
    auth.verifyOtp.mockReset().mockResolvedValue(verified);
    auth.updateUser.mockReset().mockResolvedValue({ data: { user: {} }, error: null });
    session.user = null;
  });

  it('warns when another account is signed in in this browser, before the token is used', () => {
    session.user = { email: 'bishop@test.local' };
    renderPage();
    expect(screen.getByText(/bishop@test\.local 계정으로 로그인되어 있습니다/)).toBeInTheDocument();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('does not use the token just by opening the page and shows no app navigation', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '비밀번호 설정' })).toBeInTheDocument();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(screen.queryByText('명부')).toBeNull();
    expect(screen.queryByText('로그아웃')).toBeNull();
    expect(screen.getByText(/8자 이상/)).toBeInTheDocument();
  });

  it('asks the browser for a new password, not a saved one', () => {
    renderPage();
    expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('새 비밀번호 확인')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('lets each field show the typed password', async () => {
    const user = userEvent.setup();
    renderPage();
    const field = screen.getByLabelText('새 비밀번호');
    expect(field).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('새 비밀번호 확인')).toHaveAttribute('type', 'password');
    const [toggle] = screen.getAllByRole('button', { name: /show password|비밀번호 표시/i });
    await user.click(toggle);
    expect(field).toHaveAttribute('type', 'text');
    await user.click(toggle);
    expect(field).toHaveAttribute('type', 'password');
  });

  it('does not submit a password shorter than 8 characters', async () => {
    renderPage();
    await fill('short1');
    expect(await screen.findByRole('alert')).toHaveTextContent('8자 이상');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('does not submit when the two passwords differ', async () => {
    renderPage();
    await fill('password-one', 'password-two');
    expect(await screen.findByRole('alert')).toHaveTextContent('두 비밀번호가 같지 않습니다');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('uses the token on submit, then sets the password and opens the app', async () => {
    renderPage();
    await fill('a-good-password');
    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(auth.verifyOtp).toHaveBeenCalledTimes(1);
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: HASH, type: 'invite' });
    expect(auth.updateUser).toHaveBeenCalledTimes(1);
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'a-good-password' });
    expect(auth.verifyOtp.mock.invocationCallOrder[0]).toBeLessThan(auth.updateUser.mock.invocationCallOrder[0]);
  });

  it('verifies a recovery link with the recovery type', async () => {
    renderPage(`/set-password?token_hash=${HASH}&type=recovery`);
    await fill('a-good-password');
    await screen.findByText('home page');
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: HASH, type: 'recovery' });
  });

  it('shows the expired message and sets nothing when the token is rejected', async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { session: null, user: null },
      error: Object.assign(new Error('Email link is invalid or has expired'), { status: 403, code: 'otp_expired' }),
    });
    renderPage();
    await fill('a-good-password');
    expect(await screen.findByText(EXPIRED)).toBeInTheDocument();
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('새 비밀번호')).toBeNull();
  });

  it('keeps the verified session when saving the password fails and retries without the token', async () => {
    auth.updateUser
      .mockResolvedValueOnce({
        data: { user: null },
        error: Object.assign(new Error('Password should be at least 8 characters'), {
          status: 422,
          code: 'weak_password',
        }),
      })
      .mockResolvedValueOnce({ data: { user: {} }, error: null });
    renderPage();
    const user = await fill('a-good-password');
    expect(await screen.findByRole('alert')).toHaveTextContent('더 안전한 비밀번호');
    expect(screen.getByText('new@test.local 계정의 비밀번호를 설정합니다')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('새 비밀번호'));
    await user.clear(screen.getByLabelText('새 비밀번호 확인'));
    await fill('a-better-password-2');
    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(auth.verifyOtp).toHaveBeenCalledTimes(1);
    expect(auth.updateUser).toHaveBeenCalledTimes(2);
    expect(auth.updateUser).toHaveBeenLastCalledWith({ password: 'a-better-password-2' });
  });

  it.each([
    ['another type', `/set-password?token_hash=${HASH}&type=signup`],
    ['a changed token', `/set-password?token_hash=${HASH.slice(0, 50)}zzzzzz&type=invite`],
    ['no token', '/set-password'],
  ])('shows the invalid-link message for %s without calling the server', (_label, entry) => {
    renderPage(entry);
    expect(screen.getByText(EXPIRED)).toBeInTheDocument();
    expect(screen.queryByLabelText('새 비밀번호')).toBeNull();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('keeps the link out of Referer headers while open', async () => {
    const { unmount } = renderPage();
    await waitFor(() => expect(document.querySelector('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer'));
    unmount();
    expect(document.querySelector('meta[name="referrer"]')).toBeNull();
  });
});
