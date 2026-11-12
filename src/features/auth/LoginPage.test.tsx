import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';

const signIn = vi.fn();
vi.mock('./useAuth', () => ({ useAuth: () => ({ signIn }) }));

function renderLogin(entry = '/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/roster" element={<div>roster page</div>} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/이메일/), 'bishop@test.local');
  await user.type(screen.getByLabelText(/비밀번호/), 'password');
  await user.click(screen.getByRole('button', { name: '로그인' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    signIn.mockReset();
  });

  it('has autocomplete hints, a password-reset line and no signup link', () => {
    renderLogin();
    expect(screen.getByLabelText(/이메일/)).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText(/비밀번호/)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText('비밀번호를 잊으셨나요? 관리자에게 변경 링크를 요청하세요.')).toBeInTheDocument();
    expect(screen.queryByText(/가입/)).toBeNull();
  });

  it('goes to the requested page after signing in', async () => {
    signIn.mockResolvedValue(undefined);
    renderLogin('/login?redirect=%2Froster');
    await fillAndSubmit();
    expect(await screen.findByText('roster page')).toBeInTheDocument();
  });

  it('ignores a redirect that would leave the app', async () => {
    signIn.mockResolvedValue(undefined);
    renderLogin('/login?redirect=%2F%2Fexample.com');
    await fillAndSubmit();
    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('shows the wrong-credentials message from copy.ts for an HTTP 400', async () => {
    signIn.mockRejectedValue(Object.assign(new Error('Invalid login credentials'), { status: 400 }));
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 맞지 않습니다.');
    await waitFor(() => expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled());
  });

  it('shows a generic message for other failures', async () => {
    signIn.mockRejectedValue(new Error('Failed to fetch'));
    renderLogin();
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('로그인하지 못했습니다');
  });
});
